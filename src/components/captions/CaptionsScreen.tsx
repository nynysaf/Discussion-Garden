"use client";

import { StatusPill } from "@/components/StatusPill";
import { visibleBubbles } from "@/lib/captions/caption-feed";
import { CaptionColumn } from "./CaptionColumn";
import { useCaptionFeed } from "./useCaptionFeed";

const EMPTY_MESSAGE: Record<string, string> = {
  idle: "Captions will appear here when the discussion begins.",
  paused: "Captions are paused.",
};

/** Downstairs TV — layout per DESIGN_GUIDE.md §5.1. */
export function CaptionsScreen() {
  const feed = useCaptionFeed();
  const { audioStatus, speakerColoursOn } = feed.status;

  return (
    <main className="grid h-dvh grid-cols-[58fr_42fr] grid-rows-[auto_minmax(0,1fr)_auto] gap-[2vh] overflow-hidden p-[3vh_3vw]">
      <header className="col-span-2 flex items-center justify-between gap-6">
        <h1 className="font-display text-[clamp(2rem,3.4vw,4.5rem)] font-bold uppercase leading-none tracking-[0.05em]">
          Discussion Garden
        </h1>
        <div className="flex items-center gap-4">
          <p className="rounded-full bg-festival-marigold px-[1.2em] py-[0.4em] font-display text-[clamp(1.1rem,1.8vw,2.4rem)] font-semibold italic text-festival-ink">
            Live question coming soon
          </p>
          {audioStatus !== "live" && audioStatus !== "idle" && (
            <StatusPill status={audioStatus} className="text-[clamp(0.9rem,1vw,1.3rem)]" />
          )}
        </div>
      </header>

      <section
        aria-label="Garden"
        className="flex items-center justify-center rounded-[2rem] border-2 border-dashed border-festival-green"
      >
        <p className="font-display text-[clamp(1.2rem,2vw,2.5rem)] italic opacity-50">
          The garden will grow here.
        </p>
      </section>

      <section aria-label="Live captions" className="flex min-h-0 flex-col">
        <CaptionColumn
          className="h-full text-[clamp(1.4rem,2.4vw,3rem)] font-medium"
          bubbles={visibleBubbles(feed, 8)}
          speakerColoursOn={speakerColoursOn}
          emptyMessage={EMPTY_MESSAGE[audioStatus] ?? "Listening…"}
        />
      </section>

      <footer className="col-span-2 flex items-center justify-between gap-6 rounded-2xl bg-white/60 px-[1.5vw] py-[1.2vh] text-[clamp(1rem,1.3vw,1.7rem)] shadow-poster">
        <p>
          <span className="font-semibold text-festival-forest">NOW</span>{" "}
          <span className="opacity-60">Schedule coming soon</span>
        </p>
        <div className="flex h-[9vh] w-[9vh] items-center justify-center rounded-xl border-2 border-dashed border-festival-green text-sm opacity-60">
          QR
        </div>
      </footer>
    </main>
  );
}
