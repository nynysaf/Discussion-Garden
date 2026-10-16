"use client";

import { useNow } from "@/components/useNow";
import type { FestivalState, ScheduleItem } from "@/lib/realtime/festival-state";
import { nowAndNext, timedItems } from "@/lib/schedule/schedule";
import { venueTime } from "@/lib/schedule/time";

function Entry({ label, item, current = false }: { label: string; item: ScheduleItem; current?: boolean }) {
  const time = venueTime(item.startsAt);
  return (
    <span className="flex min-w-0 items-baseline gap-[0.5em]">
      <span className={`shrink-0 font-bold tracking-wide ${current ? "text-festival-forest" : "opacity-70"}`}>
        {current && (
          <span aria-hidden className="mr-[0.35em] inline-block size-[0.6em] rounded-full bg-festival-marigold" />
        )}
        {label}
      </span>
      {time && <span className="shrink-0 tabular-nums">{time}</span>}
      <span className="truncate">{item.title}</span>
    </span>
  );
}

/** "NOW 11:00 Opening circle · NEXT 12:30 Neighbourhood commons" from the venue/computer clock. */
export function NowNextStrip({ state, className = "" }: { state: FestivalState; className?: string }) {
  // Schedule blocks are minute-level; refresh often enough to flip on time without busy ticking.
  const nowMs = useNow(15_000);
  const { now, next } = nowAndNext(timedItems(state.schedule), nowMs);

  if (!now && !next) {
    return <p className={`opacity-60 ${className}`}>Welcome to the Discussion Garden.</p>;
  }
  return (
    <p className={`flex min-w-0 items-baseline gap-[0.8em] ${className}`}>
      {now && <Entry label="NOW" item={now} current />}
      {now && next && (
        <span aria-hidden className="opacity-40">
          ·
        </span>
      )}
      {next && <Entry label={now ? "NEXT" : "UP NEXT"} item={next} />}
    </p>
  );
}
