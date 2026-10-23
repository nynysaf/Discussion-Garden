import type { Metadata } from "next";
import { ArchiveNav } from "@/components/archive/ArchiveNav";
import { ExploreGarden } from "@/components/archive/ExploreGarden";
import { loadAiMap, loadLiveGarden, loadLiveNodeDescriptions, loadTranscript } from "@/lib/archive/load";

export const metadata: Metadata = {
  title: "Explore",
  description: "Explore the garden of our thinking — Naryan's Map and AI's Map.",
};

export default function ExplorePage() {
  const segments = loadTranscript();
  const segmentsById = Object.fromEntries(segments.map((s) => [s.id, s]));

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6">
      <ArchiveNav current="/explore" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Explore the gardens
      </h1>
      <p className="mt-3 max-w-2xl text-lg opacity-85">
        Explore the garden of our thinking. A web of interconnected ideas that we planted and grew
        through dialogue.
      </p>
      <div className="mt-8">
        <ExploreGarden
          liveGarden={loadLiveGarden()}
          liveDescriptions={loadLiveNodeDescriptions()}
          aiMap={loadAiMap()}
          segmentsById={segmentsById}
        />
      </div>
    </main>
  );
}
