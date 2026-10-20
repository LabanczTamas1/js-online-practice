export type QuestionType = "code" | "text" | "multiple-choice" | "info";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  /** Optional longer description / starter info shown under the prompt. */
  description?: string;
  /** For multiple-choice questions. */
  options?: string[];
  /** Index of the correct option (multiple-choice only). */
  correctOption?: number;
  /** A reference / sample answer the facilitator can reveal. */
  sampleAnswer?: string;
  /** Programming language hint for code questions (e.g. "javascript"). */
  language?: string;
  /** Explanatory body text for "info" teaching slides. */
  body?: string;
  /** Optional code example displayed on an "info" slide. */
  codeSample?: string;
}

/** True for slides that students actually answer (not teaching slides). */
export function isAnswerable(q: Pick<Question, "type">): boolean {
  return q.type !== "info";
}

export type GamePhase = "lobby" | "question" | "results" | "ended";

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

export type ReviewStatus =
  | "pending" // queued, waiting for the AI
  | "reviewing" // currently being sent to the AI
  | "done" // AI (or facilitator) produced a score
  | "failed" // AI call failed (e.g. quota) — needs manual scoring
  | "skipped"; // no AI configured — manual scoring expected

export interface Answer {
  playerId: string;
  playerName: string;
  value: string;
  /** Selected option index for multiple-choice questions. */
  optionIndex?: number;
  submittedAt: number;
  /**
   * Whether the answer is correct. Auto-set for multiple-choice on submit.
   * `undefined` for code/text answers (they use a 0-10 score instead).
   */
  correct?: boolean;
  /**
   * Final points awarded. MCQ: 5 if correct else 0. Code/text: a 0-10 score
   * from the AI reviewer or the facilitator's manual override.
   */
  points?: number;
  /** Who set the final `points`. */
  scoredBy?: "ai" | "facilitator";
  /** AI reviewer's 0-10 score (code/text only). */
  aiScore?: number;
  /** AI reviewer's brief justification pointing out mistakes. */
  aiJustification?: string;
  /** Review lifecycle for code/text answers. */
  reviewStatus?: ReviewStatus;
}

export interface GameState {
  phase: GamePhase;
  currentQuestionIndex: number;
  /** Whether the sample / correct answer is revealed to students. */
  revealed: boolean;
  questionStartedAt: number | null;
  players: Record<string, Player>;
  /** answers[questionIndex][playerId] = Answer */
  answers: Record<number, Record<string, Answer>>;
  /** True once an AI quota/rate limit was hit; facilitator scores manually. */
  aiQuotaHit?: boolean;
  /** Last AI error message (for the facilitator notification). */
  aiError?: string | null;
  updatedAt: number;
}

export function defaultState(): GameState {
  return {
    phase: "lobby",
    currentQuestionIndex: -1,
    revealed: false,
    questionStartedAt: null,
    players: {},
    answers: {},
    updatedAt: Date.now(),
  };
}
