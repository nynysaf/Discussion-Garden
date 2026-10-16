"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CaptionBubble } from "@/lib/captions/types";
import { voiceFor } from "@/lib/captions/voice-slot";
import type { ScheduleItem } from "@/lib/realtime/festival-state";
import { AudienceQr } from "./AudienceQr";

type Props = {
  visible: boolean;
  /** Must be the live item — Highlight is unavailable until something is live. */
  now: ScheduleItem | null;
  latest: CaptionBubble | null;
  speakerColoursOn: boolean;
  emptyCaption: string;
  statusPill: ReactNode;
};

/**
 * Full-screen live inquiry (DESIGN_GUIDE §5.1b, simplified 2026-10-15):
 * the live discussion question + caption ticker + Share a question QR.
 */
export function HighlightScreen({
  visible,
  now,
  latest,
  speakerColoursOn,
  emptyCaption,
  statusPill,
}: Props) {
  const question = now?.question?.trim() || now?.title?.trim() || null;

  return (
    <section
      aria-label="Event highlight"
      aria-hidden={!visible}
      className={`highlight-layer absolute inset-0 z-10 flex flex-col gap-[2vh] bg-festival-cream p-[3vh_3vw] ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex justify-end">{statusPill}</div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[2vh] text-center">
        {question && (
          <>
            <p className="flex items-center gap-[0.5em] text-[clamp(1rem,1.7vw,2.3rem)] font-bold uppercase tracking-[0.14em] text-festival-forest">
              <span aria-hidden className="inline-block size-[0.6em] rounded-full bg-festival-marigold" />
              Live inquiry
            </p>
            <h2 className="line-clamp-4 max-w-[88vw] text-balance font-display text-[clamp(2.4rem,5.4vw,7.5rem)] font-semibold italic leading-[1.08]">
              {question}
            </h2>
          </>
        )}
      </div>

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
