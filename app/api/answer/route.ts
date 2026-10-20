import { NextRequest, NextResponse } from "next/server";
import { addAnswer, getState } from "@/lib/store";
import { Answer, isAnswerable } from "@/lib/types";
import { questions } from "@/lib/questions";
import { speedPoints } from "@/lib/scoring";

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
  let points = 0;
  if (currentQuestion.type === "multiple-choice") {
    correct =
      typeof body.optionIndex === "number" &&
      body.optionIndex === currentQuestion.correctOption;
    points = correct ? speedPoints(Date.now(), state.questionStartedAt) : 0;
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
  };

  await addAnswer(idx, answer);

  return NextResponse.json({ ok: true });
}
