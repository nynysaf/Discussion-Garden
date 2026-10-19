import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveNav } from "@/components/archive/ArchiveNav";
import { loadGlossary, segmentById } from "@/lib/archive/load";

export const metadata: Metadata = { title: "Glossary" };

export default function GlossaryPage() {
  const entries = loadGlossary();
  const byId = segmentById();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <ArchiveNav current="/glossary" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Concept glossary
      </h1>
      <p className="mt-3 text-lg opacity-85">
        Terms the weekend kept returning to — defined in the spirit of the room, with links into
        the redacted transcript where quotes exist.
      </p>
      <dl className="mt-10 space-y-8">
        {entries.map((e) => (
          <div key={e.id} className="rounded-3xl border border-festival-green bg-white/60 p-5 shadow-poster">
            <dt className="font-display text-3xl font-semibold">{e.term}</dt>
            <dd className="mt-2 text-base leading-relaxed opacity-90">{e.definition}</dd>
            {e.quoteIds.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-festival-green/40 pt-3 text-sm italic opacity-80">
                {e.quoteIds.map((id) => {
                  const s = byId.get(id);
                  if (!s) return null;
                  return (
                    <li key={id}>
                      <Link href={`/explore/transcript?q=${encodeURIComponent(s.text.slice(0, 40))}`} className="hover:text-festival-denim">
                        “{s.text}”
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </dl>
    </main>
  );
}
