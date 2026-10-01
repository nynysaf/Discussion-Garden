import type { FestivalState, ScheduleItem } from "@/lib/realtime/festival-state";
import { dayItems, nowAndNext } from "@/lib/schedule/schedule";
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

/** "NOW 11:00 Opening circle · NEXT 12:30 Neighbourhood commons" for the active day. */
export function NowNextStrip({ state, className = "" }: { state: FestivalState; className?: string }) {
  const items = dayItems(state.schedule, state.appState.activeSessionId);
  const { now, next } = nowAndNext(items, state.appState.activeScheduleItemId);

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
