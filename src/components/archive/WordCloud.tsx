"use client";

import Link from "next/link";
import type { ArchiveWord } from "@/lib/archive/types";

type Props = { words: ArchiveWord[] };

export function WordCloud({ words }: Props) {
  const max = Math.max(...words.map((w) => w.weight), 1);

  return (
    <ul className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-2 rounded-3xl border border-festival-green bg-white/50 p-8 shadow-poster">
      {words.map((w) => {
        const t = 0.75 + (w.weight / max) * 1.75;
        return (
          <li key={w.term}>
            <Link
              href={`/explore/transcript?q=${encodeURIComponent(w.term)}`}
              className="font-display font-semibold text-festival-forest transition hover:text-festival-denim"
              style={{ fontSize: `${t}rem` }}
              title={`${w.weight} mentions`}
            >
              {w.term}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
