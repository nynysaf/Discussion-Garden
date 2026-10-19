"use client";

import { useMemo, useState } from "react";
import type { ArchiveMovement, ArchiveSegment } from "@/lib/archive/types";

type Props = {
  segments: ArchiveSegment[];
  movements: ArchiveMovement[];
  initialMovementId?: string;
  initialTerm?: string;
};

export function TranscriptReader({
  segments,
  movements,
  initialMovementId,
  initialTerm,
}: Props) {
  const [day, setDay] = useState<"all" | "day_1" | "day_2">("all");
  const [movementId, setMovementId] = useState<string>(initialMovementId ?? "all");
  const [voice, setVoice] = useState<string>("all");
  const [query, setQuery] = useState(initialTerm ?? "");

  const voices = useMemo(() => {
    const set = new Set(segments.map((s) => s.voice));
    return [...set].sort();
  }, [segments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return segments.filter((s) => {
      if (day !== "all" && s.day !== day) return false;
      if (movementId !== "all" && s.movementId !== movementId) return false;
      if (voice !== "all" && s.voice !== voice) return false;
      if (q && !s.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [segments, day, movementId, voice, query]);

  const dayMovements = movements.filter((m) => day === "all" || m.day === day);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-festival-forest">
          Day
          <select
            value={day}
            onChange={(e) => {
              setDay(e.target.value as typeof day);
              setMovementId("all");
            }}
            className="rounded-xl border border-festival-green bg-white/80 px-3 py-2 text-sm font-normal normal-case tracking-normal text-festival-ink"
          >
            <option value="all">Both days</option>
            <option value="day_1">Saturday</option>
            <option value="day_2">Sunday</option>
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-festival-forest">
          Movement
          <select
            value={movementId}
            onChange={(e) => setMovementId(e.target.value)}
            className="rounded-xl border border-festival-green bg-white/80 px-3 py-2 text-sm font-normal normal-case tracking-normal text-festival-ink"
          >
            <option value="all">All movements</option>
            {dayMovements.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-festival-forest">
          Voice
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="rounded-xl border border-festival-green bg-white/80 px-3 py-2 text-sm font-normal normal-case tracking-normal text-festival-ink"
          >
            <option value="all">All voices</option>
            {voices.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-festival-forest">
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a phrase…"
            className="rounded-xl border border-festival-green bg-white/80 px-3 py-2 text-sm font-normal normal-case tracking-normal text-festival-ink"
          />
        </label>
      </div>

      <p className="text-sm opacity-70">
        Showing {filtered.length} of {segments.length} lines. Voices are garden animals only —
        never real names. Sensitive lines were removed.
      </p>

      <ol className="max-h-[70vh] space-y-3 overflow-y-auto rounded-3xl border border-festival-green/60 bg-white/50 p-4 shadow-poster">
        {filtered.map((s) => (
          <li key={s.id} id={s.id} className="scroll-mt-24 border-b border-festival-green/30 pb-3 last:border-0">
            <div className="flex flex-wrap items-baseline gap-x-2 text-xs font-semibold text-festival-forest">
              <span>{s.day === "day_1" ? "Sat" : "Sun"}</span>
              <span className="opacity-50">·</span>
              <span>[{s.clock}]</span>
              <span className="opacity-50">·</span>
              <span>{s.voice}</span>
              {s.redacted && <span className="font-normal opacity-60">(names redacted)</span>}
            </div>
            <p className="mt-1 text-base leading-relaxed">{s.text}</p>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-8 text-center opacity-60">No lines match these filters.</li>
        )}
      </ol>
    </div>
  );
}
