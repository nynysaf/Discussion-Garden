import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveNav } from "@/components/archive/ArchiveNav";
import { loadFacilitation, loadMeta, loadMovements } from "@/lib/archive/load";

export const metadata: Metadata = { title: "Facilitation" };

const OPENED_LABEL = {
  opened: "Opened space",
  quiet: "Went quiet",
  mixed: "Mixed",
} as const;

export default function FacilitationPage() {
  const rows = loadFacilitation();
  const movements = loadMovements();
  const meta = loadMeta();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <ArchiveNav current="/facilitation" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Facilitation scorecard
      </h1>
      <p className="mt-3 text-lg opacity-85">
        Rough signal from how much talk followed each live inquiry on the TVs — a provocation for
        facilitators, not a grade. Attention codes in the corpus:{" "}
        {Object.entries(meta.attention)
          .map(([k, v]) => `${k} ${v}`)
          .join(" · ")}
        .
      </p>
      <ul className="mt-10 space-y-4">
        {rows.map((row) => {
          const mov = movements.find((m) => m.inquiry === row.inquiry);
          return (
            <li
              key={row.id}
              className="rounded-3xl border border-festival-green bg-white/60 p-5 shadow-poster"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-festival-forest">
                <span>{row.day === "day_1" ? "Saturday" : "Sunday"}</span>
                <span className="rounded-full bg-festival-cream px-2 py-0.5 text-festival-ink normal-case tracking-normal">
                  {OPENED_LABEL[row.opened]}
                </span>
              </div>
              <p className="mt-2 font-display text-xl italic">“{row.inquiry}”</p>
              <p className="mt-2 text-sm opacity-80">{row.note}</p>
              {mov && (
                <Link
                  href={`/explore/transcript?movement=${encodeURIComponent(mov.id)}`}
                  className="mt-2 inline-block text-sm font-semibold text-festival-denim underline-offset-4 hover:underline"
                >
                  Open movement →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
