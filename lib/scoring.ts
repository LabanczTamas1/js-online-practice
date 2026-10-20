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
  /**
   * correct/wrong → multiple-choice outcome.
   * scored → code/text answer with a 0-10 score (see `score`).
   * pending → code/text answer still awaiting review.
   * none → the student did not answer.
   */
  status: "correct" | "wrong" | "scored" | "pending" | "none";
  optionIndex?: number;
  value?: string;
  /** 0-10 score for code/text answers. */
  score?: number;
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

/** Points awarded for a correct multiple-choice answer. */
export const MCQ_POINTS = 5;
/** Max score for an AI/facilitator-graded code or text answer. */
export const MAX_CODE_SCORE = 10;

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
      const q = questions[qi];
      if (!ans) return { status: "none" };
      if (q.type === "multiple-choice") {
        return {
          status: ans.correct ? "correct" : "wrong",
          optionIndex: ans.optionIndex,
        };
      }
      // code / text answer
      const scored =
        ans.reviewStatus === "done" || typeof ans.points === "number";
      if (scored) {
        return { status: "scored", score: ans.points ?? 0, value: ans.value };
      }
      return { status: "pending", value: ans.value };
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
