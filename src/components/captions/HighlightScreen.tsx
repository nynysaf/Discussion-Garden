"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CaptionBubble } from "@/lib/captions/types";
import { voiceFor } from "@/lib/captions/voice-slot";
import type { ScheduleItem } from "@/lib/realtime/festival-state";
import { countdownLabel } from "@/lib/schedule/countdown";
import { venueTime } from "@/lib/schedule/time";
import { AudienceQr } from "./AudienceQr";

type Props = {
  visible: boolean;
  now: ScheduleItem | null;
  next: ScheduleItem | null;
  nowMs: number;
  latest: CaptionBubble | null;
  speakerColoursOn: boolean;
  emptyCaption: string;
  statusPill: ReactNode;
};

/**
 * Full-screen "event highlight" (DESIGN_GUIDE §5.1b): the live question, what starts next,
 * and a one-line caption ticker so the room stays captioned. Read-only.
 */
export function HighlightScreen({
  visible,
  now,
  next,
  nowMs,
  latest,
  speakerColoursOn,
  emptyCaption,
  statusPill,
}: Props) {
  // With nothing live yet, the next item becomes the headline.
  const headline = now ?? next;
  const upcoming = now ? next : null;

  return (
    <section
      aria-label="Event highlight"
      aria-hidden={!visible}
      className={`highlight-layer absolute inset-0 z-10 flex flex-col gap-[2vh] bg-festival-cream p-[3vh_3vw] ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <header className="flex items-center justify-between gap-6">
        <p className="font-display text-[clamp(1.6rem,2.6vw,3.4rem)] font-bold uppercase leading-none tracking-[0.05em]">
          Discussion Garden
        </p>
        {statusPill}
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[3vh] text-center">
        {headline && (
          <>
            <p className="flex items-center gap-[0.5em] text-[clamp(1rem,1.7vw,2.3rem)] font-bold uppercase tracking-[0.14em] text-festival-forest">
              <span aria-hidden className="inline-block size-[0.6em] rounded-full bg-festival-marigold" />
              {now ? "Now discussing" : "Coming up"}
            </p>
            <h2 className="line-clamp-3 max-w-[85vw] text-balance font-display text-[clamp(2.4rem,5.4vw,7.5rem)] font-semibold italic leading-[1.08]">
              {headline.question || headline.title}
            </h2>
            {headline.question && (
              <p className="max-w-[80vw] text-[clamp(1.2rem,2.1vw,2.8rem)] font-semibold opacity-75">
                {headline.title}
              </p>
            )}
            {!now && <When item={headline} nowMs={nowMs} className="text-[clamp(1.2rem,2.1vw,2.8rem)]" />}
          </>
        )}
      </div>

      {upcoming && (
        <div className="mx-auto flex max-w-[88vw] items-baseline gap-[0.7em] rounded-2xl bg-white/70 px-[1.4em] py-[0.6em] text-[clamp(1.2rem,2.1vw,2.8rem)] shadow-poster">
          <span className="shrink-0 font-bold tracking-wide text-festival-forest">UP NEXT</span>
          {venueTime(upcoming.startsAt) && (
            <span className="shrink-0 font-semibold tabular-nums">{venueTime(upcoming.startsAt)}</span>
          )}
          <span className="min-w-0 truncate font-semibold">{upcoming.title}</span>
          {countdownLabel(upcoming.startsAt, nowMs) && (
            <span className="shrink-0 opacity-75">· {countdownLabel(upcoming.startsAt, nowMs)}</span>
          )}
        </div>
      )}

      <footer className="flex h-[12vh] items-center gap-[2vw]">
        <CaptionTicker
          bubble={latest}
          speakerColoursOn={speakerColoursOn}
          emptyMessage={emptyCaption}
          className="min-w-0 flex-1"
        />
        <AudienceQr className="h-full shrink-0 text-[clamp(0.9rem,1.1vw,1.5rem)]" />
      </footer>
    </section>
  );
}

function When({ item, nowMs, className = "" }: { item: ScheduleItem; nowMs: number; className?: string }) {
  const time = venueTime(item.startsAt);
  const countdown = countdownLabel(item.startsAt, nowMs);
  if (!time && !countdown) return null;
  return (
    <span className={`tabular-nums ${className}`}>
      {time && <span className="font-semibold">{time}</span>}
      {time && countdown && <span aria-hidden className="opacity-40"> · </span>}
      {countdown && <span className="opacity-75">{countdown}</span>}
    </span>
  );
}

/** Latest caption on one line; long sentences keep their newest words in view. */
function CaptionTicker({
  bubble,
  speakerColoursOn,
  emptyMessage,
  className = "",
}: {
  bubble: CaptionBubble | null;
  speakerColoursOn: boolean;
  emptyMessage: string;
  className?: string;
}) {
  const text = bubble ? [bubble.finalText, bubble.interimText].filter(Boolean).join(" ") : "";
  const voice = bubble ? voiceFor(bubble.speaker) : null;
  const lineRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const line = lineRef.current;
    setOverflowing(Boolean(line && line.scrollWidth > line.clientWidth + 1));
  }, [text]);
  return (
    <div
      className={`captions-ticker-type flex h-full items-center gap-[0.5em] rounded-2xl bg-white/70 px-[0.9em] font-medium shadow-poster ${className}`}
    >
      {text && voice && speakerColoursOn && (
        <Image
          src={voice.emojiSrc}
          alt={voice.animal}
          width={48}
          height={48}
          unoptimized
          className="h-[1em] w-[1em] shrink-0"
        />
      )}
      {text ? (
        <div
          ref={lineRef}
          className={`flex min-w-0 flex-1 justify-end overflow-hidden whitespace-nowrap ${overflowing ? "fade-left" : ""}`}
        >
          <p className="min-w-full shrink-0">{text}</p>
        </div>
      ) : (
        <p className="italic opacity-50">{emptyMessage}</p>
      )}
    </div>
  );
}
