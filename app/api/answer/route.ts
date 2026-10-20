import { NextRequest, NextResponse } from "next/server";
import { addAnswer, enqueueReview, getState } from "@/lib/store";
import { Answer, ReviewStatus, isAnswerable } from "@/lib/types";
import { questions } from "@/lib/questions";
import { MCQ_POINTS } from "@/lib/scoring";
import { aiEnabled } from "@/lib/gemini";

export const dynamic = "force-dynamic";

/** Student submits an answer for the current question. */
export async function POST(req: NextRequest) {
  let body: {
    playerId?: string;
    value?: string;
    optionIndex?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { playerId } = body;
  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  const state = await getState();
  const player = state.players[playerId];
  if (!player) {
    return NextResponse.json(
      { error: "Unknown player. Please re-join." },
      { status: 403 }
    );
  }

  const idx = state.currentQuestionIndex;
  if (idx < 0 || idx >= questions.length || state.phase === "lobby") {
    return NextResponse.json(
      { error: "No active question" },
      { status: 409 }
    );
  }

  const currentQuestion = questions[idx];
  if (!isAnswerable(currentQuestion)) {
    return NextResponse.json(
      { error: "This slide is not a question" },
      { status: 409 }
    );
  }

  // Auto-grade multiple-choice answers immediately.
  let correct: boolean | undefined;
  let points: number | undefined;
  let reviewStatus: ReviewStatus | undefined;
  if (currentQuestion.type === "multiple-choice") {
    correct =
      typeof body.optionIndex === "number" &&
      body.optionIndex === currentQuestion.correctOption;
    points = correct ? MCQ_POINTS : 0;
  } else {
    // Code / text answers are graded by the AI reviewer (or the facilitator).
    reviewStatus = aiEnabled() ? "pending" : "skipped";
  }

  const answer: Answer = {
    playerId,
    playerName: player.name,
    value: (body.value ?? "").slice(0, 4000),
    optionIndex:
      typeof body.optionIndex === "number" ? body.optionIndex : undefined,
    submittedAt: Date.now(),
    correct,
    points,
    reviewStatus,
  };

  await addAnswer(idx, answer);

  // Queue code/text answers for one-by-one AI review.
  if (reviewStatus === "pending") {
    await enqueueReview(idx, playerId);
  }

  return NextResponse.json({ ok: true });
}
