# JS Practice Live

A free, Kahoot-style web app for running live JavaScript practice sessions with a
class. The **facilitator** presents questions from a host console; **students**
join on their own devices, submit a code snippet / text / multiple-choice
answer, and everyone sees results update **live**.

Built with Next.js (App Router) and designed to run **free on Vercel**.

## Features

- **Facilitator console** (`/host`): start the game, move between questions,
  reveal the sample/correct answer, watch answers stream in live, reset.
- **Student view** (`/play`): join with a nickname, answer code / text /
  multiple-choice questions, see when the answer is revealed.
- **Live updates** via lightweight polling (1.5s) — no WebSocket server needed,
  so it works on Vercel's free serverless hosting.
- **Questions as code**: edit [`lib/questions.ts`](lib/questions.ts). Current
  questions cover the course units: Data types & primitives, Data type
  conversions, Mathematical operators, Reduced arithmetic & comparison
  operators, Debugging in browser, Conditional statements, Logical operators.
- Optional **host token** to protect the controls.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — use `/host` in one tab and `/play` in another.

> Locally, state is kept in memory so a single machine works out of the box with
> no configuration.

## Deploy free on Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), **Add New → Project**, import the repo.
   The framework is auto-detected (Next.js). Click **Deploy**.
3. **Add live sync (important for multi-device):** on Vercel, serverless
   functions don't share in-memory state, so add a free Redis store:
   - Create a free database at [upstash.com](https://upstash.com).
   - Copy the **REST URL** and **REST Token**.
   - In Vercel → your project → **Settings → Environment Variables**, add:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`
     - (optional) `HOST_TOKEN` — any secret string to lock the host controls.
     - (optional) `GEMINI_API_KEY` — enables the AI reviewer for code/text
       answers (free-tier [Google AI Studio](https://aistudio.google.com/app/apikey)).
       Optionally set `GEMINI_MODEL` (default `gemini-2.0-flash`).
   - Redeploy.

That's it — everything here fits comfortably inside the Vercel Hobby (free) and
Upstash free tiers.

### Scoring & AI review

- **Multiple-choice** answers auto-score **5 points** when correct.
- **Code / text** answers get a **0-10 score**. If `GEMINI_API_KEY` is set, each
  answer is reviewed one-by-one by Gemini, which returns a score plus a brief
  justification pointing only at mistakes. The facilitator can override any
  score with a 0-10 slider.
- If the AI free-tier quota / rate limit is hit, the facilitator sees a banner
  and the game continues with manual scoring; press **Resume AI** to retry.


### Why Redis?

On Vercel, each request may hit a different serverless instance, so in-memory
state isn't shared between the host and students. Upstash Redis provides a tiny,
free, shared store so live updates work across devices. Without it the app still
runs, but live sync only works within a single server process (e.g. local dev).

## Customise questions

Edit [`lib/questions.ts`](lib/questions.ts). Each question supports:

- `type`: `"code"`, `"text"`, or `"multiple-choice"`
- `prompt`, optional `description`, optional `language`
- `options` + `correctOption` for multiple-choice
- `sampleAnswer` shown when the facilitator reveals the answer

## Project structure

```
app/
  page.tsx           Landing page (choose student / facilitator)
  host/page.tsx      Facilitator console
  play/page.tsx      Student view
  api/
    state/route.ts   Live state polling endpoint
    host/route.ts    Facilitator actions (token-protected)
    join/route.ts    Student join
    answer/route.ts  Student answer submission
lib/
  questions.ts       The question set (edit me)
  types.ts           Shared types
  store.ts           Redis / in-memory shared store
  useLiveState.ts    Client polling hook
```
