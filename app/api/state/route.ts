import { NextRequest, NextResponse } from "next/server";
import { getState } from "@/lib/store";
import { questions } from "@/lib/questions";

export const dynamic = "force-dynamic";

/**
 * Public polling endpoint used by both host and students for live updates.
 * Returns the current game state plus the active question (sanitized for
 * students so the correct answer is not leaked before it is revealed).
 */
export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role") ?? "player";
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
    updatedAt: state.updatedAt,
  });
}
