"use client";

import { useEffect, useState } from "react";
import { GardenCanvas } from "@/components/garden/GardenCanvas";
import { LiveQuestion } from "@/components/realtime/LiveQuestion";
import { useGarden } from "@/components/realtime/useGarden";
import { useFestivalState } from "@/components/realtime/useFestivalState";
import { StatusPill } from "@/components/StatusPill";
import { visibleBubbles } from "@/lib/captions/caption-feed";
import { bandShare } from "@/lib/captions/layout";
import { activeScheduleItem } from "@/lib/realtime/festival-state";
import { AudienceQr } from "./AudienceQr";
import { CaptionColumn } from "./CaptionColumn";
import { HighlightScreen } from "./HighlightScreen";
import { NowNextStrip } from "./NowNextStrip";
import { useCaptionFeed } from "./useCaptionFeed";
import { useBand, useCaptionsView } from "./useCaptionsView";

const EMPTY_MESSAGE: Record<string, string> = {
  idle: "Captions will appear here when the discussion begins.",
  paused: "Captions are paused.",
};

/**
 * Downstairs TV — views Garden · Both · Captions · Highlight (DESIGN_GUIDE §5.1–5.1b),
 * picked on /admin and worked out here from app_state. Read-only.
 */
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
  const statusPill =
    pill !== "live" && pill !== "idle" ? (
      <StatusPill status={pill} className="shrink-0 text-[clamp(0.9rem,1vw,1.3rem)]" />
    ) : null;

  // Slide only once the real state has arrived, so a reload lands on the view directly.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (!festival.loaded) return;
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, [festival.loaded]);

  const { view, context, now, next, nowMs } = useCaptionsView(festival.state);
  const { band, fit } = useBand(view, context, animate);
  const share = bandShare(band);
  const bubbles = visibleBubbles(feed, 8);
  const emptyCaption = EMPTY_MESSAGE[audioStatus] ?? "Listening…";
  const slide = animate ? "band-slide" : "";

  return (
    <main className="relative grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] gap-[2vh] overflow-hidden p-[3vh_3vw]">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-[clamp(2rem,3.4vw,4.5rem)] font-bold uppercase leading-none tracking-[0.05em]">
          Discussion Garden
        </h1>
        <div className="flex min-w-0 items-center gap-4">
          <LiveQuestion
            item={activeScheduleItem(festival.state)}
            className="text-[clamp(1.1rem,1.8vw,2.4rem)]"
          />
          {statusPill}
        </div>
      </header>

      <div className="view-band relative min-h-0">
        <section
          aria-label="Garden"
          aria-hidden={share.garden === 0}
          data-band={band}
          className={`garden-frame ${slide} absolute inset-y-0 left-0 overflow-hidden rounded-[2rem] border-2 border-festival-green bg-festival-cream`}
        >
          <div data-fit={fit.garden} className="garden-fit absolute inset-y-0 left-0">
            <GardenCanvas
              garden={garden.garden}
              hidden={festival.state.appState.gardenHidden}
              className="h-full w-full"
            />
          </div>
        </section>

        <section
          aria-label="Live captions"
          aria-hidden={share.captions === 0}
          data-band={band}
          className={`captions-panel ${slide} absolute inset-y-0 right-0 overflow-hidden`}
        >
          <div data-fit={fit.captions} className="captions-fit absolute inset-y-0 flex flex-col">
            <CaptionColumn
              className={`h-full font-medium ${
                fit.captions === "captions"
                  ? "text-[clamp(1.7rem,3vw,3.7rem)]"
                  : "text-[clamp(1.4rem,2.4vw,3rem)]"
              }`}
              bubbles={bubbles}
              speakerColoursOn={speakerColoursOn}
              emptyMessage={emptyCaption}
            />
          </div>
        </section>

        <div key={band} aria-hidden className="view-fade-cover absolute inset-0 bg-festival-cream" />
      </div>

      <footer className="flex h-[13vh] items-center justify-between gap-6 rounded-2xl bg-white/60 px-[1.5vw] py-[1vh] text-[clamp(1rem,1.5vw,2rem)] shadow-poster">
        <NowNextStrip state={festival.state} className="min-w-0 flex-1" />
        <AudienceQr className="h-full shrink-0 text-[clamp(0.9rem,1.1vw,1.5rem)]" />
      </footer>

      <HighlightScreen
        visible={view === "highlight"}
        now={now}
        next={next}
        nowMs={nowMs}
        latest={bubbles.at(-1) ?? null}
        speakerColoursOn={speakerColoursOn}
        emptyCaption={emptyCaption}
        statusPill={statusPill}
      />
    </main>
  );
}
