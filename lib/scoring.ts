import { GameState, Question, isAnswerable } from "./types";

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  points: number;
  correct: number;
  answered: number;
  rank: number;
}

export interface ResultCell {
  /** "correct" | "wrong" | "ungraded" | "none" */
  status: "correct" | "wrong" | "ungraded" | "none";
  optionIndex?: number;
  value?: string;
}

export interface ResultsMatrix {
  /** Indices (into the slide list) of answerable questions, in order. */
  questionIndexes: number[];
  /** One row per player. */
  rows: Array<{
    playerId: string;
    playerName: string;
    points: number;
    correct: number;
    /** cells[k] corresponds to questionIndexes[k]. */
    cells: ResultCell[];
  }>;
}

/** Points for a correct answer. */
export const BASE_POINTS = 1000;
export const MIN_POINTS = 500;
export const MANUAL_POINTS = 800;

/**
 * Speed-based points for an auto-graded (multiple-choice) correct answer.
 * Faster answers score more, with a floor so being correct always beats wrong.
 */
export function speedPoints(
  submittedAt: number,
  questionStartedAt: number | null
): number {
  if (!questionStartedAt) return BASE_POINTS;
  const seconds = Math.max(0, (submittedAt - questionStartedAt) / 1000);
  return Math.max(MIN_POINTS, Math.round(BASE_POINTS - seconds * 25));
}

export function buildLeaderboard(
  state: GameState,
  questions: Question[]
): LeaderboardEntry[] {
  const totals: Record<
    string,
    { name: string; points: number; correct: number; answered: number }
  > = {};

  for (const player of Object.values(state.players)) {
    totals[player.id] = {
      name: player.name,
      points: 0,
      correct: 0,
      answered: 0,
    };
  }

  for (const [idxStr, byPlayer] of Object.entries(state.answers)) {
    const idx = Number(idxStr);
    const q = questions[idx];
    if (!q || !isAnswerable(q)) continue;
    for (const ans of Object.values(byPlayer)) {
      const t = totals[ans.playerId];
      if (!t) continue;
      t.answered += 1;
      if (ans.correct) t.correct += 1;
      t.points += ans.points ?? 0;
    }
  }

  const entries = Object.entries(totals)
    .map(([playerId, t]) => ({
      playerId,
      playerName: t.name,
      points: t.points,
      correct: t.correct,
      answered: t.answered,
      rank: 0,
    }))
    .sort((a, b) => b.points - a.points || b.correct - a.correct);

  entries.forEach((e, i) => {
    e.rank = i + 1;
  });
  return entries;
}

export function buildResultsMatrix(
  state: GameState,
  questions: Question[]
): ResultsMatrix {
  const questionIndexes = questions
    .map((q, i) => (isAnswerable(q) ? i : -1))
    .filter((i) => i >= 0);

  const leaderboard = buildLeaderboard(state, questions);
  const pointsById = Object.fromEntries(
    leaderboard.map((e) => [e.playerId, e])
  );

  const players = Object.values(state.players).sort((a, b) => {
    const pa = pointsById[a.id]?.points ?? 0;
    const pb = pointsById[b.id]?.points ?? 0;
    return pb - pa;
  });

  const rows = players.map((p) => {
    const cells: ResultCell[] = questionIndexes.map((qi) => {
      const ans = state.answers[qi]?.[p.id];
      if (!ans) return { status: "none" };
      let status: ResultCell["status"];
      if (ans.correct === true) status = "correct";
      else if (ans.correct === false) status = "wrong";
      else status = "ungraded";
      return { status, optionIndex: ans.optionIndex, value: ans.value };
    });
    return {
      playerId: p.id,
      playerName: p.name,
      points: pointsById[p.id]?.points ?? 0,
      correct: pointsById[p.id]?.correct ?? 0,
      cells,
    };
  });

  return { questionIndexes, rows };
}
