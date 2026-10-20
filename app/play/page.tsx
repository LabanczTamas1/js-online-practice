"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveState } from "@/lib/useLiveState";

const PLAYER_KEY = "jsgame_player";

interface StoredPlayer {
  playerId: string;
  name: string;
}

export default function PlayPage() {
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const { state } = useLiveState("player", 1500, player?.playerId);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // answer state
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lastQuestionId = useRef<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(PLAYER_KEY);
    if (saved) {
      try {
        setPlayer(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Reset the answer form whenever the active question changes.
  const qId = state?.question?.id ?? null;
  useEffect(() => {
    if (qId !== lastQuestionId.current) {
      lastQuestionId.current = qId;
      setText("");
      setSelected(null);
      setSubmitted(false);
    }
  }, [qId]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error ?? "Could not join.");
        return;
      }
      const p = { playerId: data.playerId, name: data.name };
      localStorage.setItem(PLAYER_KEY, JSON.stringify(p));
      setPlayer(p);
    } catch (err) {
      setJoinError((err as Error).message);
    } finally {
      setJoining(false);
    }
  }

  async function submit() {
    if (!player || !state?.question) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.playerId,
          value:
            state.question.type === "multiple-choice"
              ? selected !== null && state.question.options
                ? state.question.options[selected]
                : ""
              : text,
          optionIndex:
            state.question.type === "multiple-choice"
              ? selected ?? undefined
              : undefined,
        }),
      });
      if (res.status === 403) {
        // Player was reset on the server; force re-join.
        localStorage.removeItem(PLAYER_KEY);
        setPlayer(null);
        return;
      }
      if (res.ok) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function leave() {
    localStorage.removeItem(PLAYER_KEY);
    setPlayer(null);
    setName("");
  }

  // ─────────────────────────── Join screen ───────────────────────────
  if (!player) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <form
          onSubmit={join}
          className="w-full max-w-md rounded-2xl bg-white/10 p-6 animate-fade-in"
        >
          <h1 className="text-3xl font-extrabold text-center">Join the game</h1>
          <p className="mt-2 text-center text-white/70">
            Pick a nickname your facilitator will recognise.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Your name"
            className="mt-6 w-full rounded-xl bg-white/90 px-4 py-3 text-lg text-brand-purple outline-none focus:ring-4 ring-fuchsia-400"
            autoFocus
          />
          {joinError && (
            <p className="mt-2 text-rose-300 text-sm">{joinError}</p>
          )}
          <button
            type="submit"
            disabled={joining || !name.trim()}
            className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-lg font-bold hover:bg-emerald-400 disabled:opacity-50"
          >
            {joining ? "Joining…" : "Enter"}
          </button>
        </form>
      </main>
    );
  }

  const q = state?.question ?? null;
  const phase = state?.phase ?? "lobby";

  // ─────────────────────────── Play screen ───────────────────────────
  return (
    <main className="min-h-screen p-5 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60">Playing as</div>
            <div className="text-xl font-bold">{player.name}</div>
          </div>
          <button
            onClick={leave}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
          >
            Leave
          </button>
        </header>

        {phase === "lobby" && (
          <div className="mt-16 text-center animate-fade-in">
            <div className="text-6xl animate-pop">⏳</div>
            <h2 className="mt-4 text-2xl font-bold">You&apos;re in!</h2>
            <p className="mt-2 text-white/70">
              Waiting for the facilitator to start…
            </p>
          </div>
        )}

        {phase === "ended" && (
          <div className="mt-10 animate-fade-in">
            <div className="text-center">
              <div className="text-6xl">🎉</div>
              <h2 className="mt-4 text-2xl font-bold">That&apos;s a wrap!</h2>
              <p className="mt-2 text-white/70">Here&apos;s the final leaderboard.</p>
            </div>

            {(() => {
              const board = state?.leaderboard ?? [];
              const me = board.find((e) => e.playerId === player.playerId);
              return (
                <>
                  {me && (
                    <div className="mt-6 rounded-2xl bg-fuchsia-500/20 p-5 text-center animate-pop">
                      <div className="text-sm text-white/70">Your result</div>
                      <div className="mt-1 text-3xl font-extrabold">
                        #{me.rank} · {me.points} pts
                      </div>
                      <div className="text-sm text-white/70">
                        {me.correct} correct
                      </div>
                    </div>
                  )}
                  <div className="mt-6 space-y-2">
                    {board.map((e) => {
                      const isMe = e.playerId === player.playerId;
                      const medal =
                        e.rank === 1
                          ? "🥇"
                          : e.rank === 2
                          ? "🥈"
                          : e.rank === 3
                          ? "🥉"
                          : `${e.rank}.`;
                      return (
                        <div
                          key={e.playerId}
                          className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                            isMe
                              ? "bg-fuchsia-500/30 border border-fuchsia-300/50"
                              : "bg-black/25"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 text-lg">{medal}</span>
                            <span className="font-semibold">
                              {e.playerName}
                              {isMe && " (you)"}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{e.points} pts</div>
                            <div className="text-xs text-white/60">
                              {e.correct} correct
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {board.length === 0 && (
                      <div className="text-center text-white/50">
                        No scores recorded.
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Teaching slide */}
        {(phase === "question" || phase === "results") &&
          q &&
          q.type === "info" && (
            <section className="mt-6 rounded-2xl bg-white/5 p-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">
                  Slide {state!.currentQuestionIndex + 1} /{" "}
                  {state!.totalQuestions}
                </span>
                <span className="rounded-full bg-cyan-500/30 px-3 py-0.5 text-xs uppercase tracking-wide">
                  learn
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold">{q.prompt}</h2>
              {q.body && (
                <div className="mt-3 space-y-2 text-white/85 leading-relaxed">
                  {q.body.split("\n\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
              {q.codeSample && (
                <pre className="code mt-4 overflow-auto rounded-lg bg-black/40 p-4 text-sm text-cyan-100 whitespace-pre-wrap">
                  {q.codeSample}
                </pre>
              )}
              <p className="mt-4 text-center text-sm text-white/50">
                Read along — a question is coming up next.
              </p>
            </section>
          )}

        {(phase === "question" || phase === "results") &&
          q &&
          q.type !== "info" && (
          <section className="mt-6 rounded-2xl bg-white/5 p-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">
                Question {state!.currentQuestionIndex + 1} /{" "}
                {state!.totalQuestions}
              </span>
              <span className="rounded-full bg-fuchsia-500/30 px-3 py-0.5 text-xs uppercase tracking-wide">
                {q.type}
              </span>
            </div>
            {q.description && (
              <div className="mt-1 text-xs text-cyan-200/80">
                {q.description}
              </div>
            )}
            <h2 className="mt-2 text-2xl font-bold">{q.prompt}</h2>

            {/* Answer input */}
            {q.type === "multiple-choice" && q.options ? (
              <div className="mt-5 grid gap-3">
                {q.options.map((opt, i) => {
                  const chosen = selected === i;
                  const isCorrect =
                    state!.revealed && i === q.correctOption;
                  return (
                    <button
                      key={i}
                      disabled={submitted || state!.revealed}
                      onClick={() => setSelected(i)}
                      className={`rounded-xl px-4 py-3 text-left font-semibold transition border-2 ${
                        isCorrect
                          ? "border-emerald-400 bg-emerald-400/20"
                          : chosen
                          ? "border-fuchsia-400 bg-fuchsia-500/30"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      } disabled:cursor-not-allowed`}
                    >
                      <span className="font-mono text-white/60 mr-2">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={submitted}
                placeholder={
                  q.type === "code"
                    ? "// Write your code here"
                    : "Type your answer…"
                }
                rows={q.type === "code" ? 8 : 4}
                className="code mt-5 w-full rounded-xl bg-black/40 p-4 text-sm outline-none focus:ring-2 ring-fuchsia-400 disabled:opacity-60"
              />
            )}

            {/* Submit / status */}
            {!submitted ? (
              <button
                onClick={submit}
                disabled={
                  submitting ||
                  state!.revealed ||
                  (q.type === "multiple-choice"
                    ? selected === null
                    : !text.trim())
                }
                className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 text-lg font-bold hover:bg-emerald-400 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Submit answer"}
              </button>
            ) : (
              <div className="mt-5 rounded-xl bg-emerald-500/20 px-4 py-3 text-center font-semibold text-emerald-200 animate-pop">
                ✓ Answer submitted — you can still watch the results.
              </div>
            )}

            {/* Revealed sample answer */}
            {state!.revealed && q.sampleAnswer && (
              <div className="mt-5">
                <div className="text-sm font-semibold text-emerald-300">
                  Sample answer
                </div>
                <pre className="mt-1 overflow-auto rounded-lg bg-black/40 p-3 text-sm text-emerald-100 whitespace-pre-wrap">
                  {q.sampleAnswer}
                </pre>
              </div>
            )}

            {/* Your review (code/text answers, after reveal) */}
            {state!.revealed &&
              q.type !== "multiple-choice" &&
              state!.myReview && (
                <div className="mt-5 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4">
                  <div className="text-sm font-semibold text-fuchsia-200">
                    Your score
                  </div>
                  {typeof state!.myReview.points === "number" ? (
                    <div className="mt-1 text-2xl font-extrabold">
                      {state!.myReview.points}/10
                      <span className="ml-2 text-xs font-normal text-white/60">
                        {state!.myReview.scoredBy === "facilitator"
                          ? "(by facilitator)"
                          : "(AI review)"}
                      </span>
                    </div>
                  ) : state!.myReview.reviewStatus === "reviewing" ? (
                    <div className="mt-1 text-sm text-cyan-200">
                      AI is reviewing your answer…
                    </div>
                  ) : state!.myReview.reviewStatus === "pending" ? (
                    <div className="mt-1 text-sm text-white/60">
                      Waiting to be reviewed…
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-white/60">
                      Awaiting the facilitator&apos;s score.
                    </div>
                  )}
                  {state!.myReview.aiJustification && (
                    <p className="mt-2 text-sm text-white/85">
                      {state!.myReview.aiJustification}
                    </p>
                  )}
                </div>
              )}

            <div className="mt-4 text-center text-sm text-white/50">
              {state!.answerCount} of {state!.playerCount} answered
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
