import type { Metadata } from "next";
import { ArchiveNav } from "@/components/archive/ArchiveNav";
import { WordCloud } from "@/components/archive/WordCloud";
import { loadWordcloud } from "@/lib/archive/load";

export const metadata: Metadata = {
  title: "Words",
  description: "Word cloud from the redacted Discussion Garden transcript.",
};

export default function WordsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <ArchiveNav current="/explore/words" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Word cloud
      </h1>
      <p className="mt-3 max-w-2xl text-lg opacity-85">
        Frequent terms from the redacted corpus (stopwords removed). Click a word to jump into
        matching transcript lines.
      </p>
      <div className="mt-10">
        <WordCloud words={loadWordcloud()} />
      </div>
    </main>
  );
}
