import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveNav } from "@/components/archive/ArchiveNav";

export const metadata: Metadata = { title: "Workshop kit" };

const CONSTRAINTS = [
  "Aim for aliveness and wholeness — follow energy while caring for coherence.",
  "If you aren’t learning nor contributing, feel free to leave. It isn’t rude.",
  "When defensiveness arises, pause and return to curiosity.",
  "Thinking is a full-body activity — invite sensation, emotion, and story as data.",
];

const STACK = [
  { name: "Next.js", role: "App routes for host, captions TV, audience, room feed" },
  { name: "Supabase", role: "Auth (hosts), Postgres + RLS, Realtime broadcasts" },
  { name: "Deepgram", role: "Streaming STT + diarization; short-lived browser tokens" },
  { name: "OpenAI", role: "Hybrid synthesis proposals only — never on the caption path" },
  { name: "d3-force", role: "Garden layout that settles, then holds still on TVs" },
];

export default function WorkshopPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <ArchiveNav current="/workshop" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Workshop kit
      </h1>
      <p className="mt-3 text-lg opacity-85">
        A one-page starter for hosting your own Discussion Garden — facilitation constraints,
        threshold ritual, and the tech shape without the secrets.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-3xl font-semibold">Threshold</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-relaxed opacity-90">
          <li>Invite people to take a pebble-seed and ask what they want to plant.</li>
          <li>Drop the seed in water; enter in silence; listen before speaking.</li>
          <li>Signage: recorded kitchen table; off-record on request; unrecorded side rooms OK.</li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl font-semibold">Enabling constraints</h2>
        <ul className="mt-3 space-y-3">
          {CONSTRAINTS.map((c) => (
            <li
              key={c}
              className="rounded-2xl border border-festival-green bg-white/60 px-4 py-3 text-base shadow-poster"
            >
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl font-semibold">Four surfaces</h2>
        <ul className="mt-3 space-y-2 text-base opacity-90">
          <li>
            <strong>/admin</strong> — host laptop: mic, schedule, garden editor, AI drafts, moderation
          </li>
          <li>
            <strong>/captions</strong> — downstairs TV: bubbles + garden + live inquiry (read-only)
          </li>
          <li>
            <strong>/audience</strong> — phones, zero login, rate-limited thoughts
          </li>
          <li>
            <strong>/room-feed</strong> — upstairs TV: audience messages the host can hide or pause
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl font-semibold">Stack (no keys)</h2>
        <ul className="mt-3 space-y-2">
          {STACK.map((s) => (
            <li key={s.name} className="text-base">
              <span className="font-semibold text-festival-forest">{s.name}</span>
              <span className="opacity-80"> — {s.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-3xl border border-festival-forest/30 bg-festival-cream p-5">
        <h2 className="font-display text-2xl font-semibold">Non-negotiables</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm opacity-90">
          <li>Captions never depend on AI.</li>
          <li>Displays are read-only; hosts control what stays on public TVs.</li>
          <li>Keys stay server-side; freeze spendy routes when the event ends.</li>
          <li>Transcripts are private until redacted for a deliberate public archive.</li>
        </ul>
      </section>

      <p className="mt-8 text-sm opacity-70">
        Source: open{" "}
        <Link href="https://github.com/nynysaf/Discussion-Garden" className="text-festival-denim underline-offset-2 hover:underline">
          Discussion Garden on GitHub
        </Link>
        . Adapt freely; rotate your own keys.
      </p>
    </main>
  );
}
