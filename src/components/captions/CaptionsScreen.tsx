"use client";

import { GardenCanvas } from "@/components/garden/GardenCanvas";
import { LiveQuestion } from "@/components/realtime/LiveQuestion";
import { useGarden } from "@/components/realtime/useGarden";
import { useFestivalState } from "@/components/realtime/useFestivalState";
import { StatusPill } from "@/components/StatusPill";
import { visibleBubbles } from "@/lib/captions/caption-feed";
import { activeScheduleItem } from "@/lib/realtime/festival-state";
import { AudienceQr } from "./AudienceQr";
import { CaptionColumn } from "./CaptionColumn";
import { NowNextStrip } from "./NowNextStrip";
import { useCaptionFeed } from "./useCaptionFeed";

const EMPTY_MESSAGE: Record<string, string> = {
  idle: "Captions will appear here when the discussion begins.",
  paused: "Captions are paused.",
};

/** Downstairs TV — layout per DESIGN_GUIDE.md §5.1. Read-only. */
export function CaptionsScreen() {
  const festival = useFestivalState();
  const garden = useGarden();
  const { feed, connection } = useCaptionFeed(festival.state.appState, festival.loaded);
  const { audioStatus, speakerColoursOn } = feed.status;
  const offline =
    connection === "reconnecting" ||
    festival.connection === "reconnecting" ||
    garden.connection === "reconnecting";
  const pill = offline ? "reconnecting" : audioStatus;

  return (
    <main className="grid h-dvh grid-cols-[58fr_42fr] grid-rows-[auto_minmax(0,1fr)_auto] gap-[2vh] overflow-hidden p-[3vh_3vw]">
      <header className="col-span-2 flex items-center justify-between gap-6">
        <h1 className="font-display text-[clamp(2rem,3.4vw,4.5rem)] font-bold uppercase leading-none tracking-[0.05em]">
          Discussion Garden
        </h1>
        <div className="flex min-w-0 items-center gap-4">
          <LiveQuestion
            item={activeScheduleItem(festival.state)}
            className="text-[clamp(1.1rem,1.8vw,2.4rem)]"
          />
          {pill !== "live" && pill !== "idle" && (
            <StatusPill status={pill} className="shrink-0 text-[clamp(0.9rem,1vw,1.3rem)]" />
          )}
        </div>
      </header>

      <section
        aria-label="Garden"
        className="min-h-0 overflow-hidden rounded-[2rem] border-2 border-festival-green bg-festival-cream"
      >
        <GardenCanvas
          garden={garden.garden}
          hidden={festival.state.appState.gardenHidden}
          className="h-full w-full"
        />
      </section>

      <section aria-label="Live captions" className="flex min-h-0 flex-col">
        <CaptionColumn
          className="h-full text-[clamp(1.4rem,2.4vw,3rem)] font-medium"
          bubbles={visibleBubbles(feed, 8)}
          speakerColoursOn={speakerColoursOn}
          emptyMessage={EMPTY_MESSAGE[audioStatus] ?? "Listening…"}
        />
      </section>

      <footer className="col-span-2 flex h-[13vh] items-center justify-between gap-6 rounded-2xl bg-white/60 px-[1.5vw] py-[1vh] text-[clamp(1rem,1.5vw,2rem)] shadow-poster">
        <NowNextStrip state={festival.state} className="min-w-0 flex-1" />
        <AudienceQr className="h-full shrink-0 text-[clamp(0.9rem,1.1vw,1.5rem)]" />
      </footer>
    </main>
  );
}
