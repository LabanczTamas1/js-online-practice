import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl text-center animate-fade-in">
        <div className="inline-block rounded-2xl bg-white/10 px-4 py-1 text-sm font-medium tracking-wide mb-6">
          Live classroom practice
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight">
          JS Practice{" "}
          <span className="bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
            Live
          </span>
        </h1>
        <p className="mt-4 text-lg text-white/80">
          Kahoot-style JavaScript questions. The facilitator presents each
          question, students answer with code or text, and everyone sees results
          update live.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/play"
            className="group rounded-2xl bg-white text-brand-purple p-6 text-left shadow-xl hover:scale-[1.02] transition"
          >
            <div className="text-2xl font-bold">I&apos;m a student</div>
            <p className="mt-1 text-brand-purple/70">
              Join with your name and start answering.
            </p>
            <span className="mt-4 inline-block font-semibold group-hover:translate-x-1 transition">
              Join game →
            </span>
          </Link>

          <Link
            href="/host"
            className="group rounded-2xl bg-fuchsia-600/90 p-6 text-left shadow-xl hover:scale-[1.02] transition"
          >
            <div className="text-2xl font-bold">I&apos;m the facilitator</div>
            <p className="mt-1 text-white/80">
              Present questions and control the game.
            </p>
            <span className="mt-4 inline-block font-semibold group-hover:translate-x-1 transition">
              Open host view →
            </span>
          </Link>
        </div>

        <p className="mt-10 text-sm text-white/50">
          Free to host on Vercel. Add Upstash Redis for multi-device live sync.
        </p>
      </div>
    </main>
  );
}
