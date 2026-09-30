"use client";

import { ComingSoon } from "@/components/ComingSoon";
import { LiveQuestion } from "@/components/realtime/LiveQuestion";
import { useFestivalState } from "@/components/realtime/useFestivalState";
import { StatusPill } from "@/components/StatusPill";
import { activeScheduleItem } from "@/lib/realtime/festival-state";

/** Upstairs TV. Read-only. */
export function RoomFeedScreen() {
  const festival = useFestivalState();

  return (
    <main className="flex h-dvh flex-col gap-[3vh] p-[3vh_3vw]">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-[clamp(2rem,3.4vw,4.5rem)] font-bold uppercase tracking-[0.05em]">
          Discussion Garden
        </h1>
        <div className="flex min-w-0 items-center gap-4">
          <LiveQuestion
            item={activeScheduleItem(festival.state)}
            className="text-[clamp(1.1rem,1.8vw,2.4rem)]"
          />
          {festival.connection === "reconnecting" && (
            <StatusPill status="reconnecting" className="shrink-0 text-[clamp(0.9rem,1vw,1.3rem)]" />
          )}
        </div>
      </header>
      <ComingSoon className="flex-1" title="Audience questions & reflections" phase="Phase 4">
        Host-approved submissions will scroll here, with the one being discussed pinned.
      </ComingSoon>
    </main>
  );
}
