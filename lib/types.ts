export type QuestionType = "code" | "text" | "multiple-choice";

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
}

export type GamePhase = "lobby" | "question" | "results" | "ended";

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

export interface Answer {
  playerId: string;
  playerName: string;
  value: string;
  /** Selected option index for multiple-choice questions. */
  optionIndex?: number;
  submittedAt: number;
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
