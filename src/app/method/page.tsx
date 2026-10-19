import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveNav } from "@/components/archive/ArchiveNav";

export const metadata: Metadata = { title: "Method" };

export default function MethodPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <ArchiveNav current="/method" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Method
      </h1>
      <p className="mt-3 font-display text-2xl italic opacity-90">
        How the garden listened, grew, and stays safe as a public archive.
      </p>

      <article className="mt-10 space-y-6 text-lg leading-relaxed opacity-90">
        <section>
          <h2 className="font-display text-3xl font-semibold">Captions never wait on AI</h2>
          <p className="mt-2">
            Speech went from the host microphone to Deepgram, then into speech-bubble captions on
            the downstairs TV. Synthesis could fail, stall, or be turned off — and captions kept
            flowing. That separation is the core reliability rule of the system.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl font-semibold">Hybrid approval</h2>
          <p className="mt-2">
            In Hybrid mode, an offline-style loop proposed new garden seeds, sprouts, and themes
            from recent talk. Hosts approved or rejected every AI draft before it appeared on
            public screens. Auto mode existed; Manual was the safe boot default.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl font-semibold">Animal voices, never names</h2>
          <p className="mt-2">
            Diarization labelled speakers as garden animals — Frog, Bird, Ladybug — with colour and
            emoji together. No names, roles, or initials on any screen. The archive keeps that
            contract; the public transcript further replaces spoken names with [Name] and drops
            sensitive lines.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl font-semibold">One shared garden</h2>
          <p className="mt-2">
            Saturday and Sunday grew the same garden. Session slugs only partitioned transcripts.
            Sunday opened with Saturday’s plants still on the wall — a digital twin of the yarn and
            sticky synthesis wall imagined in the original proposal.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl font-semibold">Three readings after the fact</h2>
          <p className="mt-2">
            The portfolio contrasts the live festival garden with an AI sensemaking map of the full
            corpus and a host-seeded map of themes that felt most meaningful in the room —
            signal vs noise, threshold, aporia, contact, presence, and dialogue toward action.
            Machine pattern-finding beside human presence is the harvest method.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl font-semibold">Keys stay off the public surface</h2>
          <p className="mt-2">
            After the festival, Deepgram tokens, OpenAI synthesis, and audience submissions return
            HTTP 410. Visitors explore static archive JSON — no spendy APIs, no login required.
          </p>
        </section>
      </article>

      <p className="mt-10">
        <Link href="/explore" className="font-semibold text-festival-denim underline-offset-4 hover:underline">
          Open the dual-map explore →
        </Link>
      </p>
    </main>
  );
}
