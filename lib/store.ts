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

interface GameMeta {
  phase: GamePhase;
  currentQuestionIndex: number;
  revealed: boolean;
  questionStartedAt: number | null;
  updatedAt: number;
}

function defaultMeta(): GameMeta {
  return {
    phase: "lobby",
    currentQuestionIndex: -1,
    revealed: false,
    questionStartedAt: null,
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
      updatedAt: Date.now(),
    };
    mutate(m);
    s.phase = m.phase;
    s.currentQuestionIndex = m.currentQuestionIndex;
    s.revealed = m.revealed;
    s.questionStartedAt = m.questionStartedAt;
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
    s.answers = {};
    s.updatedAt = Date.now();
    return;
  }
  await redis.del(ANSWERS_KEY);
  await redis.set(META_KEY, defaultMeta());
}

/** Bump the meta timestamp so pollers notice a change promptly. */
async function touchMeta(): Promise<void> {
  if (!redis) return;
  const meta = (await redis.get<GameMeta>(META_KEY)) ?? defaultMeta();
  meta.updatedAt = Date.now();
  await redis.set(META_KEY, meta);
}
