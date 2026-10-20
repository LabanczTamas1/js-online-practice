import { NextRequest, NextResponse } from "next/server";
import {
  dequeueReview,
  getState,
  setAiReview,
  setReviewStatus,
  setAiQuota,
  setAiError,
  reviewQueueLength,
} from "@/lib/store";
import { questions } from "@/lib/questions";
import { reviewAnswer, aiEnabled, QuotaError } from "@/lib/gemini";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest, token: string | undefined): boolean {
  const expected = process.env.HOST_TOKEN;
  if (!expected) return true; // dev fallback
  return token === expected;
}

/**
 * Processes ONE item from the AI review queue per call. The host page polls
 * this on an interval (~4s) to stay within the free-tier rate limit.
 */
export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!authorized(req, body.token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!aiEnabled()) {
    return NextResponse.json({
      processed: false,
      reason: "ai-disabled",
      remaining: await reviewQueueLength(),
    });
  }

  const state = await getState();
  if (state.aiQuotaHit) {
    return NextResponse.json({
      processed: false,
      quotaHit: true,
      remaining: await reviewQueueLength(),
    });
  }

  const item = await dequeueReview();
  if (!item) {
    return NextResponse.json({ processed: false, remaining: 0 });
  }

  const { questionIndex, playerId } = item;
  const question = questions[questionIndex];
  const answer = state.answers[questionIndex]?.[playerId];

  // The answer might have been removed (reset) or already scored manually.
  if (!question || !answer || answer.scoredBy === "facilitator") {
    return NextResponse.json({
      processed: false,
      skipped: true,
      remaining: await reviewQueueLength(),
    });
  }

  await setReviewStatus(questionIndex, playerId, "reviewing");

  try {
    const result = await reviewAnswer(question, answer.value);
    await setAiReview(
      questionIndex,
      playerId,
      result.score,
      result.justification,
      "done"
    );
    // A success clears any previous transient error banner.
    if (state.aiError) await setAiError(null);
    return NextResponse.json({
      processed: true,
      score: result.score,
      remaining: await reviewQueueLength(),
    });
  } catch (err) {
    if (err instanceof QuotaError) {
      // Flag quota and mark this item for manual scoring.
      await setAiQuota(true, err.message);
      await setReviewStatus(questionIndex, playerId, "failed");
      return NextResponse.json({
        processed: false,
        quotaHit: true,
        remaining: await reviewQueueLength(),
      });
    }
    await setReviewStatus(questionIndex, playerId, "failed");
    const message = err instanceof Error ? err.message : "AI review failed";
    await setAiError(message);
    return NextResponse.json({
      processed: false,
      error: message,
      remaining: await reviewQueueLength(),
    });
  }
}
