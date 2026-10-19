"use client";

import { useEffect, useRef, useState } from "react";

export interface LiveAnswer {
  playerId: string;
  playerName: string;
  value?: string;
  optionIndex?: number;
  submittedAt: number;
}

export interface LivePlayer {
  id: string;
  name: string;
  joinedAt: number;
}

export interface LiveQuestion {
  id: string;
  type: "code" | "text" | "multiple-choice";
  prompt: string;
  description?: string;
  options?: string[];
  correctOption?: number;
  sampleAnswer?: string;
  language?: string;
}

export interface LiveState {
  phase: "lobby" | "question" | "results" | "ended";
  currentQuestionIndex: number;
  totalQuestions: number;
  revealed: boolean;
  questionStartedAt: number | null;
  question: LiveQuestion | null;
  players: LivePlayer[];
  playerCount: number;
  answers: LiveAnswer[];
  answerCount: number;
  updatedAt: number;
}

/**
 * Polls the shared state endpoint for live updates. Polling (every ~1.5s) is
 * used instead of WebSockets because it works reliably on Vercel's free,
 * serverless hosting with zero extra infrastructure.
 */
export function useLiveState(role: "host" | "player", intervalMs = 1500) {
  const [state, setState] = useState<LiveState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/state?role=${role}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: LiveState = await res.json();
        if (!cancelled) {
          setState(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) {
          timer.current = setTimeout(tick, intervalMs);
        }
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [role, intervalMs]);

  return { state, error };
}
