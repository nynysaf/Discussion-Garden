import type { Metadata } from "next";
import { ArchiveNav } from "@/components/archive/ArchiveNav";
import { ExploreGarden } from "@/components/archive/ExploreGarden";
import {
  loadAiMap,
  loadHostMap,
  loadLiveGarden,
  loadLiveNodeDescriptions,
  loadTranscript,
} from "@/lib/archive/load";

export const metadata: Metadata = {
  title: "Explore",
  description: "Interactive Discussion Garden — festival, AI, and host readings.",
};

export default function ExplorePage() {
  const segments = loadTranscript();
  const segmentsById = Object.fromEntries(segments.map((s) => [s.id, s]));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <ArchiveNav current="/explore" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Explore the gardens
      </h1>
      <p className="mt-3 max-w-2xl text-lg opacity-85">
        Three lenses on one weekend. The festival garden grew live under host approval. The AI
        reading clusters the full redacted corpus. The host reading names what felt most alive —
        signal, threshold, contact, and the path from dialogue toward action.
      </p>
      <div className="mt-8">
        <ExploreGarden
          liveGarden={loadLiveGarden()}
          liveDescriptions={loadLiveNodeDescriptions()}
          aiMap={loadAiMap()}
          hostMap={loadHostMap()}
          segmentsById={segmentsById}
        />
      </div>
    </main>
  );
}
