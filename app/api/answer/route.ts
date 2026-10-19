import { NextRequest, NextResponse } from "next/server";
import { updateState, getState } from "@/lib/store";
import { Answer } from "@/lib/types";
import { questions } from "@/lib/questions";

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

  const answer: Answer = {
    playerId,
    playerName: player.name,
    value: (body.value ?? "").slice(0, 4000),
    optionIndex:
      typeof body.optionIndex === "number" ? body.optionIndex : undefined,
    submittedAt: Date.now(),
  };

  await updateState((s) => {
    if (!s.answers[idx]) s.answers[idx] = {};
    s.answers[idx][playerId] = answer;
  });

  return NextResponse.json({ ok: true });
}
