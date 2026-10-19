import { NextRequest, NextResponse } from "next/server";
import { updateState } from "@/lib/store";
import { defaultState } from "@/lib/types";
import { questions } from "@/lib/questions";

export const dynamic = "force-dynamic";

/**
 * Facilitator-only control endpoint. Protected by a shared host token.
 *
 * Set HOST_TOKEN in your environment (Vercel → Project → Settings → Env Vars).
 * If it is not set, any token is accepted (convenient for local dev only).
 */
function authorized(req: NextRequest, token: string | undefined): boolean {
  const expected = process.env.HOST_TOKEN;
  if (!expected) return true; // dev fallback
  return token === expected;
}

type Action =
  | "start"
  | "next"
  | "prev"
  | "goto"
  | "reveal"
  | "hide"
  | "results"
  | "reset"
  | "end";

export async function POST(req: NextRequest) {
  let body: { action?: Action; token?: string; index?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!authorized(req, body.token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const state = await updateState((s) => {
    switch (action) {
      case "start":
        s.phase = "question";
        s.currentQuestionIndex = 0;
        s.revealed = false;
        s.questionStartedAt = Date.now();
        break;
      case "next":
        if (s.currentQuestionIndex < questions.length - 1) {
          s.currentQuestionIndex += 1;
          s.phase = "question";
          s.revealed = false;
          s.questionStartedAt = Date.now();
        } else {
          s.phase = "ended";
        }
        break;
      case "prev":
        if (s.currentQuestionIndex > 0) {
          s.currentQuestionIndex -= 1;
          s.phase = "question";
          s.revealed = false;
          s.questionStartedAt = Date.now();
        }
        break;
      case "goto":
        if (
          typeof body.index === "number" &&
          body.index >= 0 &&
          body.index < questions.length
        ) {
          s.currentQuestionIndex = body.index;
          s.phase = "question";
          s.revealed = false;
          s.questionStartedAt = Date.now();
        }
        break;
      case "reveal":
        s.revealed = true;
        s.phase = "results";
        break;
      case "hide":
        s.revealed = false;
        s.phase = "question";
        break;
      case "results":
        s.phase = "results";
        break;
      case "reset": {
        // Keep connected players, clear progress and answers.
        const players = s.players;
        const fresh = defaultState();
        fresh.players = players;
        return fresh;
      }
      case "end":
        s.phase = "ended";
        break;
      default:
        break;
    }
  });

  return NextResponse.json({ ok: true, phase: state.phase });
}
