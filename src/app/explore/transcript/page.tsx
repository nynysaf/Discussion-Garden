import type { Metadata } from "next";
import { ArchiveNav } from "@/components/archive/ArchiveNav";
import { TranscriptReader } from "@/components/archive/TranscriptReader";
import { loadMovements, loadTranscript } from "@/lib/archive/load";

export const metadata: Metadata = {
  title: "Transcript",
  description: "Redacted Discussion Garden transcript — explore by day and movement.",
};

type Props = { searchParams: Promise<{ movement?: string; q?: string }> };

export default async function TranscriptPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <ArchiveNav current="/explore/transcript" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Redacted transcript
      </h1>
      <p className="mt-3 max-w-2xl text-lg opacity-85">
        A cleaned, public-safe reading of the weekend. Names are replaced; private stories are
        cut. Filter by the “musical movements” carved by live inquiries on the TVs.
      </p>
      <div className="mt-8">
        <TranscriptReader
          segments={loadTranscript()}
          movements={loadMovements()}
          initialMovementId={params.movement}
          initialTerm={params.q}
        />
      </div>
    </main>
  );
}
