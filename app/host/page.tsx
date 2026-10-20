"use client";

import { useEffect, useState } from "react";
import { useLiveState, LiveState } from "@/lib/useLiveState";

const TOKEN_KEY = "jsgame_host_token";

export default function HostPage() {
  const { state, error } = useLiveState("host", 1500);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  async function send(action: string, index?: number) {
    setBusy(true);
    setActionError(null);
    try {
      localStorage.setItem(TOKEN_KEY, token);
      const res = await fetch("/api/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, token, index }),
      });
      if (res.status === 401) {
        setActionError("Wrong host token.");
      } else if (!res.ok) {
        setActionError(`Error: HTTP ${res.status}`);
      }
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function score(
    playerId: string,
    questionIndex: number,
    points: number
  ) {
    try {
      await fetch("/api/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score",
          token,
          playerId,
          questionIndex,
          points,
        }),
      });
    } catch {
      /* ignore transient errors; next poll reflects state */
    }
  }

  async function resumeAi() {
    try {
      await fetch("/api/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resumeAi", token }),
      });
    } catch {
      /* ignore */
    }
  }

  // Drive the AI review queue one item at a time (~every 4.5s) so we stay
  // comfortably within the free-tier rate limit. Pauses while quota is hit.
  const quotaHit = state?.aiQuotaHit ?? false;
  useEffect(() => {
    if (quotaHit) return;
    const t = setInterval(() => {
      fetch("/api/review/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }, 4500);
    return () => clearInterval(t);
  }, [quotaHit, token]);

  const q = state?.question ?? null;
  const idx = state?.currentQuestionIndex ?? -1;
  const total = state?.totalQuestions ?? 0;
  const isInfo = q?.type === "info";
  const ended = state?.phase === "ended";

  return (
    <main className="min-h-screen p-5 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Facilitator console</h1>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm">
              {state ? `${state.playerCount} players` : "…"}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm capitalize">
              {state?.phase ?? "connecting"}
            </span>
          </div>
        </header>

        {/* Host token */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-black/20 p-3">
          <label className="text-sm text-white/70">Host token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Set HOST_TOKEN to protect controls"
            className="flex-1 min-w-[180px] rounded-lg bg-white/10 px-3 py-1.5 text-sm outline-none focus:ring-2 ring-fuchsia-400"
          />
          {actionError && (
            <span className="text-sm text-rose-300">{actionError}</span>
          )}
          {error && <span className="text-sm text-amber-300">conn: {error}</span>}
        </div>

        {/* AI quota notification */}
        {state?.aiQuotaHit && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/15 p-3">
            <span className="text-amber-200 text-sm">
              ⚠️ AI reviewer paused — rate limit / quota reached
              {state.aiError ? `: ${state.aiError}` : "."} Score code/text
              answers manually with the sliders below.
            </span>
            <button
              onClick={resumeAi}
              className="ml-auto rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-amber-400"
            >
              Resume AI
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => send("start")}
            disabled={busy}
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold hover:bg-emerald-400 disabled:opacity-50"
          >
            Start
          </button>
          <button
            onClick={() => send("prev")}
            disabled={busy || idx <= 0}
            className="rounded-lg bg-white/10 px-4 py-2 font-semibold hover:bg-white/20 disabled:opacity-40"
          >
            ◀ Prev
          </button>
          <button
            onClick={() => send("next")}
            disabled={busy || idx < 0}
            className="rounded-lg bg-white/10 px-4 py-2 font-semibold hover:bg-white/20 disabled:opacity-40"
          >
            Next ▶
          </button>
          {state?.revealed ? (
            <button
              onClick={() => send("hide")}
              disabled={busy || idx < 0 || isInfo}
              className="rounded-lg bg-amber-500 px-4 py-2 font-semibold hover:bg-amber-400 disabled:opacity-50"
            >
              Hide answer
            </button>
          ) : (
            <button
              onClick={() => send("reveal")}
              disabled={busy || idx < 0 || isInfo}
              className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-brand-purpledark hover:bg-cyan-400 disabled:opacity-50"
            >
              Reveal answer
            </button>
          )}
          <button
            onClick={() => send("end")}
            disabled={busy || idx < 0}
            className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold hover:bg-indigo-400 disabled:opacity-50"
          >
            End &amp; show results
          </button>
          <button
            onClick={() => send("reset")}
            disabled={busy}
            className="ml-auto rounded-lg bg-rose-600/80 px-4 py-2 font-semibold hover:bg-rose-500 disabled:opacity-50"
          >
            Reset game
          </button>
        </div>

        {ended ? (
          <EndResults state={state} />
        ) : (
        /* Current question */
        <section className="mt-6 grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-2xl bg-white/5 p-5 animate-fade-in">
            {idx >= 0 && q ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">
                    {isInfo ? "Slide" : "Question"} {idx + 1} / {total}
                  </span>
                  <span className="rounded-full bg-fuchsia-500/30 px-3 py-0.5 text-xs uppercase tracking-wide">
                    {isInfo ? "info" : q.type}
                  </span>
                </div>
                {q.description && (
                  <div className="mt-1 text-xs text-cyan-200/80">
                    {q.description}
                  </div>
                )}
                <h2 className="mt-2 text-2xl font-bold">{q.prompt}</h2>

                {isInfo && q.body && (
                  <div className="mt-3 space-y-2 text-white/85 leading-relaxed">
                    {q.body.split("\n\n").map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}
                {isInfo && q.codeSample && (
                  <pre className="code mt-4 overflow-auto rounded-lg bg-black/40 p-3 text-sm text-cyan-100 whitespace-pre-wrap">
                    {q.codeSample}
                  </pre>
                )}

                {q.type === "multiple-choice" && q.options && (
                  <ul className="mt-4 space-y-2">
                    {q.options.map((opt, i) => (
                      <li
                        key={i}
                        className={`rounded-lg px-4 py-2 border ${
                          state?.revealed && i === q.correctOption
                            ? "border-emerald-400 bg-emerald-400/20"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <span className="font-mono text-white/60 mr-2">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {opt}
                      </li>
                    ))}
                  </ul>
                )}

                {state?.revealed && q.sampleAnswer && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-emerald-300">
                      Sample answer
                    </div>
                    <pre className="mt-1 overflow-auto rounded-lg bg-black/40 p-3 text-sm text-emerald-100 whitespace-pre-wrap">
                      {q.sampleAnswer}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-white/60">
                Press Start to show the first slide.
              </div>
            )}
          </div>

          {/* Live answers */}
          <div className="lg:col-span-2 rounded-2xl bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Live answers</h3>
              <span className="rounded-full bg-emerald-500/30 px-3 py-0.5 text-sm">
                {state?.answerCount ?? 0} / {state?.playerCount ?? 0}
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[55vh] overflow-auto pr-1">
              {isInfo ? (
                <div className="text-sm text-white/50 py-6 text-center">
                  Teaching slide — no answers needed. Press Next ▶ when ready.
                </div>
              ) : state && state.answers.length > 0 ? (
                state.answers
                  .slice()
                  .sort((a, b) => a.submittedAt - b.submittedAt)
                  .map((a) => {
                    const mc = q?.type === "multiple-choice";
                    const correct =
                      mc &&
                      typeof a.optionIndex === "number" &&
                      a.optionIndex === q?.correctOption;
                    return (
                      <div
                        key={a.playerId}
                        className="rounded-lg bg-black/25 p-3 animate-pop"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{a.playerName}</span>
                          {mc && state.revealed && (
                            <span
                              className={
                                correct
                                  ? "text-emerald-300 text-sm"
                                  : "text-rose-300 text-sm"
                              }
                            >
                              {correct ? "✓ correct" : "✗"}
                            </span>
                          )}
                        </div>
                        {mc &&
                        typeof a.optionIndex === "number" &&
                        q?.options ? (
                          <div className="mt-1 text-sm text-white/80">
                            {String.fromCharCode(65 + a.optionIndex)}.{" "}
                            {q.options[a.optionIndex]}
                          </div>
                        ) : (
                          <pre className="mt-1 whitespace-pre-wrap text-sm text-white/80 font-mono">
                            {a.value}
                          </pre>
                        )}

                        {/* AI review + manual 0-10 scoring for code/text */}
                        {!mc && (
                          <div className="mt-2 space-y-2">
                            {a.aiJustification && (
                              <div className="rounded-md bg-fuchsia-500/10 border border-fuchsia-400/20 px-2 py-1.5 text-xs text-fuchsia-100">
                                <span className="font-semibold">
                                  AI {a.aiScore}/10
                                </span>{" "}
                                — {a.aiJustification}
                              </div>
                            )}
                            {a.reviewStatus === "reviewing" && (
                              <div className="text-xs text-cyan-300">
                                AI reviewing…
                              </div>
                            )}
                            {a.reviewStatus === "pending" && (
                              <div className="text-xs text-white/40">
                                queued for AI review…
                              </div>
                            )}
                            {a.reviewStatus === "failed" && (
                              <div className="text-xs text-amber-300">
                                AI unavailable — score manually
                              </div>
                            )}
                            <ScoreSlider
                              value={a.points}
                              scoredBy={a.scoredBy}
                              onCommit={(pts) => score(a.playerId, idx, pts)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="text-sm text-white/50 py-6 text-center">
                  Waiting for submissions…
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {/* Player roster */}
        <section className="mt-6 rounded-2xl bg-white/5 p-5">
          <h3 className="font-semibold">Players in lobby</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {state && state.players.length > 0 ? (
              state.players.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full bg-white/10 px-3 py-1 text-sm animate-pop"
                >
                  {p.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-white/50">
                Share the link so students can join /play
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function medal(rank: number): string {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
}

function EndResults({ state }: { state: LiveState | null }) {
  if (!state) return null;
  const board = state.leaderboard ?? [];
  const results = state.results;
  const titles = state.questionTitles ?? [];

  return (
    <div className="mt-6 space-y-6 animate-fade-in">
      {/* Leaderboard */}
      <section className="rounded-2xl bg-white/5 p-5">
        <h2 className="text-xl font-bold">🏆 Final leaderboard</h2>
        <div className="mt-4 space-y-2">
          {board.length === 0 && (
            <div className="text-white/50">No players.</div>
          )}
          {board.map((e) => (
            <div
              key={e.playerId}
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                e.rank === 1
                  ? "bg-yellow-400/20 border border-yellow-300/40"
                  : "bg-black/25"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 text-lg">{medal(e.rank)}</span>
                <span className="font-semibold">{e.playerName}</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{e.points} pts</div>
                <div className="text-xs text-white/60">
                  {e.correct} correct
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Per-question results table */}
      <section className="rounded-2xl bg-white/5 p-5">
        <h2 className="text-xl font-bold">Results by question</h2>
        <p className="mt-1 text-sm text-white/60">
          ✓ correct · ✗ wrong · 0-10 code/text score · ⏳ awaiting review · —
          not answered.
        </p>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-brand-purpledark/80 px-3 py-2 text-left">
                  Student
                </th>
                {results?.questionIndexes.map((qi, k) => (
                  <th
                    key={qi}
                    className="px-2 py-2 text-center whitespace-nowrap"
                    title={titles[qi]?.prompt}
                  >
                    Q{k + 1}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {results && results.rows.length > 0 ? (
                results.rows.map((row) => (
                  <tr key={row.playerId} className="border-t border-white/10">
                    <td className="sticky left-0 bg-brand-purpledark/80 px-3 py-2 font-semibold whitespace-nowrap">
                      {row.playerName}
                    </td>
                    {row.cells.map((c, k) => (
                      <td key={k} className="px-2 py-2 text-center">
                        {c.status === "correct" && (
                          <span className="text-emerald-300">✓</span>
                        )}
                        {c.status === "wrong" && (
                          <span className="text-rose-300">✗</span>
                        )}
                        {c.status === "scored" && (
                          <span className="font-semibold text-cyan-200">
                            {c.score}
                          </span>
                        )}
                        {c.status === "pending" && (
                          <span className="text-amber-300">⏳</span>
                        )}
                        {c.status === "none" && (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-bold">
                      {row.points}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={(results?.questionIndexes.length ?? 0) + 2}
                    className="px-3 py-6 text-center text-white/50"
                  >
                    No results yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/**
 * 0-10 slider for the facilitator to score (or override) a code/text answer.
 * Commits on release so we don't spam the API while dragging.
 */
function ScoreSlider({
  value,
  scoredBy,
  onCommit,
}: {
  value?: number;
  scoredBy?: "ai" | "facilitator";
  onCommit: (points: number) => void;
}) {
  const [local, setLocal] = useState<number>(value ?? 5);

  useEffect(() => {
    if (typeof value === "number") setLocal(value);
  }, [value]);

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        onMouseUp={() => onCommit(local)}
        onTouchEnd={() => onCommit(local)}
        className="flex-1 accent-fuchsia-400"
      />
      <span className="w-14 text-right text-sm font-bold">{local}/10</span>
      {scoredBy && (
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
            scoredBy === "facilitator"
              ? "bg-emerald-500/30 text-emerald-200"
              : "bg-fuchsia-500/30 text-fuchsia-200"
          }`}
        >
          {scoredBy === "facilitator" ? "manual" : "ai"}
        </span>
      )}
    </div>
  );
}
