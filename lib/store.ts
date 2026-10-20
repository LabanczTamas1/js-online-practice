import { Redis } from "@upstash/redis";
import { GameState, GamePhase, Player, Answer, defaultState } from "./types";

/**
 * Shared state store.
 *
 * IMPORTANT (concurrency): earlier this stored the whole game as one JSON blob
 * and did read-modify-write on every submission. On Vercel's multi-instance
 * serverless runtime, simultaneous student submissions then overwrote each
 * other (lost updates) — some answers/scores silently vanished.
 *
 * This version splits state across Redis hashes so each write touches a single
 * field atomically:
 *   - jsgame:meta     → control state (phase, current question, etc.)
 *   - jsgame:players  → hash  field=playerId              value=Player
 *   - jsgame:answers  → hash  field="<qIndex>:<playerId>" value=Answer
 *   - jsgame:names    → hash  field=lowercased name       value=playerId
 *                        (used with HSETNX to reserve a unique name)
 *
 * Locally (no Redis env vars) we keep everything in a single in-memory object,
 * which is safe because dev runs in one process.
 */

const META_KEY = "jsgame:meta";
const PLAYERS_KEY = "jsgame:players";
const ANSWERS_KEY = "jsgame:answers";
const NAMES_KEY = "jsgame:names";
const QUEUE_KEY = "jsgame:reviewq";

interface GameMeta {
  phase: GamePhase;
  currentQuestionIndex: number;
  revealed: boolean;
  questionStartedAt: number | null;
  aiQuotaHit?: boolean;
  aiError?: string | null;
  updatedAt: number;
}

function defaultMeta(): GameMeta {
  return {
    phase: "lobby",
    currentQuestionIndex: -1,
    revealed: false,
    questionStartedAt: null,
    aiQuotaHit: false,
    aiError: null,
    updatedAt: Date.now(),
  };
}

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis ? Redis.fromEnv() : null;

// Module-level fallback store for local dev (single process).
const globalForStore = globalThis as unknown as {
  __jsGameState?: GameState;
  __jsGameNames?: Record<string, string>;
  __jsGameQueue?: string[];
};

function memState(): GameState {
  if (!globalForStore.__jsGameState) {
    globalForStore.__jsGameState = defaultState();
  }
  return globalForStore.__jsGameState;
}

function memNames(): Record<string, string> {
  if (!globalForStore.__jsGameNames) {
    globalForStore.__jsGameNames = {};
  }
  return globalForStore.__jsGameNames;
}

function memQueue(): string[] {
  if (!globalForStore.__jsGameQueue) {
    globalForStore.__jsGameQueue = [];
  }
  return globalForStore.__jsGameQueue;
}

export function usingRedis(): boolean {
  return hasRedis;
}

/** Assemble the full game state for reads. */
export async function getState(): Promise<GameState> {
  if (!redis) {
    return memState();
  }

  const [meta, playersHash, answersHash] = await Promise.all([
    redis.get<GameMeta>(META_KEY),
    redis.hgetall<Record<string, Player>>(PLAYERS_KEY),
    redis.hgetall<Record<string, Answer>>(ANSWERS_KEY),
  ]);

  const m = meta ?? defaultMeta();
  const players: Record<string, Player> = playersHash ?? {};

  const answers: Record<number, Record<string, Answer>> = {};
  for (const [field, answer] of Object.entries(answersHash ?? {})) {
    const sep = field.indexOf(":");
    if (sep < 0) continue;
    const qIndex = Number(field.slice(0, sep));
    const playerId = field.slice(sep + 1);
    if (!answers[qIndex]) answers[qIndex] = {};
    answers[qIndex][playerId] = answer;
  }

  return {
    phase: m.phase,
    currentQuestionIndex: m.currentQuestionIndex,
    revealed: m.revealed,
    questionStartedAt: m.questionStartedAt,
    players,
    answers,
    aiQuotaHit: m.aiQuotaHit ?? false,
    aiError: m.aiError ?? null,
    updatedAt: m.updatedAt,
  };
}

/**
 * Atomically reserve a display name and register the player.
 * Returns true if the name was free (player added), false if already taken.
 */
export async function reserveNameAndAddPlayer(
  player: Player
): Promise<boolean> {
  const nameKey = player.name.trim().toLowerCase();

  if (!redis) {
    const names = memNames();
    if (names[nameKey]) return false;
    names[nameKey] = player.id;
    memState().players[player.id] = player;
    return true;
  }

  // HSETNX is atomic: only one request can claim a given name.
  const reserved = await redis.hsetnx(NAMES_KEY, nameKey, player.id);
  if (reserved !== 1) return false;

  await redis.hset(PLAYERS_KEY, { [player.id]: player });
  await touchMeta();
  return true;
}

/** Store a student's answer. Field key keeps writes independent/atomic. */
export async function addAnswer(
  questionIndex: number,
  answer: Answer
): Promise<void> {
  if (!redis) {
    const s = memState();
    if (!s.answers[questionIndex]) s.answers[questionIndex] = {};
    s.answers[questionIndex][answer.playerId] = answer;
    s.updatedAt = Date.now();
    return;
  }
  await redis.hset(ANSWERS_KEY, {
    [`${questionIndex}:${answer.playerId}`]: answer,
  });
  await touchMeta();
}

/** Facilitator marks a code/text answer correct/incorrect. */
export async function markAnswer(
  questionIndex: number,
  playerId: string,
  correct: boolean,
  points: number
): Promise<void> {
  if (!redis) {
    const ans = memState().answers[questionIndex]?.[playerId];
    if (ans) {
      ans.correct = correct;
      ans.points = points;
    }
    return;
  }
  const field = `${questionIndex}:${playerId}`;
  const ans = await redis.hget<Answer>(ANSWERS_KEY, field);
  if (!ans) return;
  ans.correct = correct;
  ans.points = points;
  await redis.hset(ANSWERS_KEY, { [field]: ans });
  await touchMeta();
}


/**
 * Record an AI review for a code/text answer. Sets aiScore/aiJustification/
 * reviewStatus. Only applies the score to `points`/`scoredBy` if the
 * facilitator has not already scored it manually.
 */
export async function setAiReview(
  questionIndex: number,
  playerId: string,
  aiScore: number,
  justification: string,
  status: Answer["reviewStatus"] = "done"
): Promise<void> {
  const apply = (ans: Answer) => {
    ans.aiScore = aiScore;
    ans.aiJustification = justification;
    ans.reviewStatus = status;
    if (ans.scoredBy !== "facilitator") {
      ans.points = aiScore;
      ans.scoredBy = "ai";
    }
  };
  if (!redis) {
    const ans = memState().answers[questionIndex]?.[playerId];
    if (ans) apply(ans);
    return;
  }
  const field = `${questionIndex}:${playerId}`;
  const ans = await redis.hget<Answer>(ANSWERS_KEY, field);
  if (!ans) return;
  apply(ans);
  await redis.hset(ANSWERS_KEY, { [field]: ans });
  await touchMeta();
}

/** Mark a review as currently being processed (or failed/skipped). */
export async function setReviewStatus(
  questionIndex: number,
  playerId: string,
  status: Answer["reviewStatus"]
): Promise<void> {
  if (!redis) {
    const ans = memState().answers[questionIndex]?.[playerId];
    if (ans) ans.reviewStatus = status;
    return;
  }
  const field = `${questionIndex}:${playerId}`;
  const ans = await redis.hget<Answer>(ANSWERS_KEY, field);
  if (!ans) return;
  ans.reviewStatus = status;
  await redis.hset(ANSWERS_KEY, { [field]: ans });
  await touchMeta();
}

/** Facilitator sets a manual 0-10 score for a code/text answer. */
export async function setManualScore(
  questionIndex: number,
  playerId: string,
  points: number
): Promise<void> {
  const apply = (ans: Answer) => {
    ans.points = points;
    ans.scoredBy = "facilitator";
    ans.reviewStatus = "done";
  };
  if (!redis) {
    const ans = memState().answers[questionIndex]?.[playerId];
    if (ans) apply(ans);
    return;
  }
  const field = `${questionIndex}:${playerId}`;
  const ans = await redis.hget<Answer>(ANSWERS_KEY, field);
  if (!ans) return;
  apply(ans);
  await redis.hset(ANSWERS_KEY, { [field]: ans });
  await touchMeta();
}

/** Push an answer onto the AI review queue. */
export async function enqueueReview(
  questionIndex: number,
  playerId: string
): Promise<void> {
  const item = `${questionIndex}:${playerId}`;
  if (!redis) {
    memQueue().push(item);
    return;
  }
  await redis.rpush(QUEUE_KEY, item);
}

/** Pop the next answer to review, or null if the queue is empty. */
export async function dequeueReview(): Promise<{
  questionIndex: number;
  playerId: string;
} | null> {
  let item: string | null = null;
  if (!redis) {
    item = memQueue().shift() ?? null;
  } else {
    item = await redis.lpop<string>(QUEUE_KEY);
  }
  if (!item) return null;
  const sep = item.indexOf(":");
  if (sep < 0) return null;
  return {
    questionIndex: Number(item.slice(0, sep)),
    playerId: item.slice(sep + 1),
  };
}

/** How many answers are still waiting for AI review. */
export async function reviewQueueLength(): Promise<number> {
  if (!redis) return memQueue().length;
  return (await redis.llen(QUEUE_KEY)) ?? 0;
}

/** Flag/clear the AI quota-reached state for the facilitator. */
export async function setAiQuota(
  hit: boolean,
  error: string | null = null
): Promise<void> {
  await updateMeta((m) => {
    m.aiQuotaHit = hit;
    m.aiError = error;
  });
}

/** Read-modify-write on the small control-state object (host actions only). */
export async function updateMeta(
  mutate: (meta: GameMeta) => void
): Promise<void> {
  if (!redis) {
    const s = memState();
    const m: GameMeta = {
      phase: s.phase,
      currentQuestionIndex: s.currentQuestionIndex,
      revealed: s.revealed,
      questionStartedAt: s.questionStartedAt,
      aiQuotaHit: s.aiQuotaHit,
      aiError: s.aiError,
      updatedAt: Date.now(),
    };
    mutate(m);
    s.phase = m.phase;
    s.currentQuestionIndex = m.currentQuestionIndex;
    s.revealed = m.revealed;
    s.questionStartedAt = m.questionStartedAt;
    s.aiQuotaHit = m.aiQuotaHit;
    s.aiError = m.aiError;
    s.updatedAt = Date.now();
    return;
  }
  const meta = (await redis.get<GameMeta>(META_KEY)) ?? defaultMeta();
  mutate(meta);
  meta.updatedAt = Date.now();
  await redis.set(META_KEY, meta);
}

/** Clear all answers (and reset control state) but keep players + names. */
export async function resetGame(): Promise<void> {
  if (!redis) {
    const s = memState();
    s.phase = "lobby";
    s.currentQuestionIndex = -1;
    s.revealed = false;
    s.questionStartedAt = null;
    s.aiQuotaHit = false;
    s.aiError = null;
    s.answers = {};
    s.updatedAt = Date.now();
    memQueue().length = 0;
    return;
  }
  await redis.del(ANSWERS_KEY);
  await redis.del(QUEUE_KEY);
  await redis.set(META_KEY, defaultMeta());
}

/** Bump the meta timestamp so pollers notice a change promptly. */
async function touchMeta(): Promise<void> {
  if (!redis) return;
  const meta = (await redis.get<GameMeta>(META_KEY)) ?? defaultMeta();
  meta.updatedAt = Date.now();
  await redis.set(META_KEY, meta);
}
