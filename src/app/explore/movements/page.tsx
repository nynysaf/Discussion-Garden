import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveNav } from "@/components/archive/ArchiveNav";
import { loadMovements } from "@/lib/archive/load";

export const metadata: Metadata = {
  title: "Movements",
  description: "Dialogue movements — sections carved by live inquiries.",
};

export default function MovementsPage() {
  const movements = loadMovements();
  const sat = movements.filter((m) => m.day === "day_1");
  const sun = movements.filter((m) => m.day === "day_2");

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <ArchiveNav current="/explore/movements" />
      <h1 className="mt-8 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Musical movements
      </h1>
      <p className="mt-3 max-w-2xl text-lg opacity-85">
        Live inquiries on the downstairs TVs divided the weekend into sections — like movements
        in a longer piece. Open any section in the transcript reader.
      </p>

      <DayBlock title="Saturday" items={sat} />
      <DayBlock title="Sunday" items={sun} />
    </main>
  );
}

function DayBlock({
  title,
  items,
}: {
  title: string;
  items: ReturnType<typeof loadMovements>;
}) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-3xl font-semibold uppercase tracking-[0.04em]">{title}</h2>
      <ol className="mt-4 space-y-4">
        {items.map((m, i) => (
          <li
            key={m.id}
            className="rounded-3xl border border-festival-green bg-white/60 p-5 shadow-poster"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-festival-forest">
              Movement {i + 1} · {m.segmentIds.length} lines
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold">{m.title}</h3>
            {m.inquiry && (
              <p className="mt-2 font-display text-lg italic text-festival-denim">
                “{m.inquiry}”
              </p>
            )}
            <p className="mt-2 text-sm opacity-80">{m.summary}</p>
            <Link
              href={`/explore/transcript?movement=${encodeURIComponent(m.id)}`}
              className="mt-3 inline-block text-sm font-semibold text-festival-denim underline-offset-4 hover:underline"
            >
              Read this movement →
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
