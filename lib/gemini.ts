import { Question } from "./types";

/**
 * Thin client for Google's Gemini API (free tier friendly).
 *
 * Set GEMINI_API_KEY in your environment. Optionally set GEMINI_MODEL
 * (default: "gemini-flash-latest"). If no key is present, aiEnabled() is false
 * and the app falls back to facilitator-only scoring.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

export function aiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export interface ReviewResult {
  /** 0-10 integer score. */
  score: number;
  /** Brief justification focused on mistakes. */
  justification: string;
}

/** Thrown when the API signals a rate limit / quota exhaustion (HTTP 429). */
export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

function buildPrompt(
  question: Question,
  studentAnswer: string
): string {
  const kind = question.type === "code" ? "code snippet" : "text answer";
  return [
    "You are a strict but fair JavaScript teaching assistant grading a student's practice answer.",
    "",
    `Task type: ${kind}`,
    `Question: ${question.prompt}`,
    question.sampleAnswer
      ? `Reference / expected answer: ${question.sampleAnswer}`
      : "",
    "",
    "Student's answer:",
    "```",
    studentAnswer || "(empty)",
    "```",
    "",
    "Grade it from 0 to 10 (integer).",
    "Write a VERY brief justification (max 2 short sentences). The student will",
    "already see the correct answer, so do NOT restate it. Only point out THEIR",
    "specific mistakes — covering correctness/logic, syntax, and formatting where",
    "relevant. If it is fully correct, say so in a few words.",
    "",
    'Respond ONLY with compact JSON: {"score": <0-10 integer>, "justification": "<text>"}',
  ]
    .filter(Boolean)
    .join("\n");
}

function parseReview(text: string): ReviewResult {
  // Extract the first JSON object from the model output.
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? match[0] : text;
  let parsed: { score?: unknown; justification?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: find a leading number as the score.
    const num = text.match(/\b(\d{1,2})\b/);
    return {
      score: num ? clampScore(Number(num[1])) : 0,
      justification: text.trim().slice(0, 400) || "No justification provided.",
    };
  }
  return {
    score: clampScore(Number(parsed.score)),
    justification:
      typeof parsed.justification === "string"
        ? parsed.justification.trim().slice(0, 400)
        : "No justification provided.",
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

/** Review a single student answer. Throws QuotaError on HTTP 429. */
export async function reviewAnswer(
  question: Question,
  studentAnswer: string
): Promise<ReviewResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildPrompt(question, studentAnswer) }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 200,
        responseMimeType: "application/json",
      },
    }),
  });

  if (res.status === 429) {
    throw new QuotaError("Gemini rate limit / quota reached (HTTP 429).");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Some quota errors come back as 403 with RESOURCE_EXHAUSTED.
    if (/RESOURCE_EXHAUSTED|quota/i.test(body)) {
      throw new QuotaError("Gemini quota exhausted.");
    }
    throw new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  return parseReview(text);
}
