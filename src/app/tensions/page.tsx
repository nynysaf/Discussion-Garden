import type { Metadata } from "next";
import { ArchiveNav } from "@/components/archive/ArchiveNav";
import { loadTensions, segmentById } from "@/lib/archive/load";

export const metadata: Metadata = { title: "Tensions" };

export default function TensionsPage() {
  const pairs = loadTensions();
  const byId = segmentById();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <ArchiveNav current="/tensions" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Tension map
      </h1>
      <p className="mt-3 text-lg opacity-85">
        Productive disagreements the weekend held — pairs of ideas that pulled against each other
        without needing a quick winner.
      </p>
      <ul className="mt-10 space-y-6">
        {pairs.map((p) => (
          <li key={p.id} className="rounded-3xl border border-festival-green bg-white/60 p-5 shadow-poster">
            <p className="font-display text-2xl font-semibold">
              <span>{p.a}</span>
              <span className="mx-2 text-festival-denim">↔</span>
              <span>{p.b}</span>
            </p>
            <p className="mt-2 leading-relaxed opacity-90">{p.note}</p>
            {p.quoteIds.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm italic opacity-75">
                {p.quoteIds.map((id) => {
                  const s = byId.get(id);
                  return s ? <li key={id}>“{s.text}”</li> : null;
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
