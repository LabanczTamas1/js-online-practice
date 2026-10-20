import { NextRequest, NextResponse } from "next/server";
import { getState } from "@/lib/store";
import { questions } from "@/lib/questions";
import { buildLeaderboard, buildResultsMatrix } from "@/lib/scoring";

export const dynamic = "force-dynamic";

/**
 * Public polling endpoint used by both host and students for live updates.
 * Returns the current game state plus the active question (sanitized for
 * students so the correct answer is not leaked before it is revealed).
 */
export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role") ?? "player";
  const pid = req.nextUrl.searchParams.get("pid") ?? undefined;
  const state = await getState();

  const idx = state.currentQuestionIndex;
  const rawQuestion =
    idx >= 0 && idx < questions.length ? questions[idx] : null;

  let question = rawQuestion;
  if (rawQuestion && role !== "host" && !state.revealed) {
    // Strip answer keys for students until the facilitator reveals them.
    const { correctOption, sampleAnswer, ...safe } = rawQuestion;
    question = safe;
  }

  const answersForQuestion =
    idx >= 0 ? Object.values(state.answers[idx] ?? {}) : [];

  const leaderboard = buildLeaderboard(state, questions);

  // A student's own review (AI score + justification) for the current
  // question, shown only after the facilitator reveals the answer.
  let myReview: {
    reviewStatus?: string;
    aiScore?: number;
    aiJustification?: string;
    points?: number;
    scoredBy?: string;
    correct?: boolean;
  } | null = null;
  if (role !== "host" && pid && idx >= 0 && state.revealed) {
    const mine = state.answers[idx]?.[pid];
    if (mine) {
      myReview = {
        reviewStatus: mine.reviewStatus,
        aiScore: mine.aiScore,
        aiJustification: mine.aiJustification,
        points: mine.points,
        scoredBy: mine.scoredBy,
        correct: mine.correct,
      };
    }
  }

  return NextResponse.json({
    phase: state.phase,
    currentQuestionIndex: idx,
    totalQuestions: questions.length,
    revealed: state.revealed,
    questionStartedAt: state.questionStartedAt,
    question,
    players: Object.values(state.players).sort(
      (a, b) => a.joinedAt - b.joinedAt
    ),
    playerCount: Object.keys(state.players).length,
    answers:
      role === "host"
        ? answersForQuestion
        : answersForQuestion.map((a) => ({
            playerId: a.playerId,
            playerName: a.playerName,
            submittedAt: a.submittedAt,
          })),
    answerCount: answersForQuestion.length,
    leaderboard,
    myReview,
    // AI reviewer status is surfaced to the facilitator only.
    aiQuotaHit: role === "host" ? state.aiQuotaHit ?? false : undefined,
    aiError: role === "host" ? state.aiError ?? null : undefined,
    // Full per-question results matrix is host-only.
    results: role === "host" ? buildResultsMatrix(state, questions) : null,
    // Question prompts for the results table header (host-only).
    questionTitles:
      role === "host"
        ? questions.map((q) => ({ type: q.type, prompt: q.prompt }))
        : null,
    updatedAt: state.updatedAt,
  });
}
