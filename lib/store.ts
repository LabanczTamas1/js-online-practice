import { Redis } from "@upstash/redis";
import { GameState, defaultState } from "./types";

const STATE_KEY = "jsgame:state";

/**
 * Shared state store.
 *
 * On Vercel (or any multi-instance serverless host) in-memory state is NOT
 * shared between function invocations, so live updates would break. If the
 * Upstash Redis env vars are present we use Redis as a shared store. For local
 * development (single Node process) we transparently fall back to memory.
 */
const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis ? Redis.fromEnv() : null;

// Module-level fallback store for local dev.
const globalForStore = globalThis as unknown as {
  __jsGameState?: GameState;
};

export function usingRedis(): boolean {
  return hasRedis;
}

export async function getState(): Promise<GameState> {
  if (redis) {
    const state = await redis.get<GameState>(STATE_KEY);
    return state ?? defaultState();
  }
  if (!globalForStore.__jsGameState) {
    globalForStore.__jsGameState = defaultState();
  }
  return globalForStore.__jsGameState;
}

export async function setState(state: GameState): Promise<void> {
  state.updatedAt = Date.now();
  if (redis) {
    await redis.set(STATE_KEY, state);
    return;
  }
  globalForStore.__jsGameState = state;
}

/**
 * Read-modify-write helper. Note: for a single facilitator and small class
 * this is sufficient. It is not a strict atomic transaction, but host actions
 * are serialized by the facilitator and student writes touch distinct keys.
 */
export async function updateState(
  mutate: (state: GameState) => GameState | void
): Promise<GameState> {
  const current = await getState();
  const next = mutate(current) ?? current;
  await setState(next);
  return next;
}
