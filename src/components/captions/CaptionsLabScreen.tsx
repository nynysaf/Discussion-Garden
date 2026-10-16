"use client";

import { useMemo, useState } from "react";
import { CaptionColumn } from "@/components/captions/CaptionColumn";
import { AudienceQr } from "@/components/captions/AudienceQr";
import {
  LAB_BUBBLES,
  LAB_NEXT,
  LAB_QUESTION,
  LAB_TITLE,
} from "@/lib/captions/lab-samples";
import { voiceFor } from "@/lib/captions/voice-slot";
import Image from "next/image";

export type LabVariant = "both-side" | "both-stack" | "highlight-plain" | "highlight-soft";

const VARIANTS: { id: LabVariant; label: string; blurb: string }[] = [
  {
    id: "both-side",
    label: "Both · side by side",
    blurb: "Current festival layout: garden left, captions right.",
  },
  {
    id: "both-stack",
    label: "Both · stacked",
    blurb: "Garden on top; captions as a full-width strip underneath.",
  },
  {
    id: "highlight-plain",
    label: "Highlight · cream",
    blurb: "Current Highlight: large question on cream with a ticker.",
  },
  {
    id: "highlight-soft",
    label: "Highlight · soft field",
    blurb: "Same question, with a soft green field behind it.",
  },
];

/**
 * Offline layout sandbox for /captions experiments. Uses made-up sample talk;
 * does not touch the database or the live TV channel.
 */
export function CaptionsLabScreen() {
  const [variant, setVariant] = useState<LabVariant>("both-side");
  const latest = LAB_BUBBLES.at(-1) ?? null;
  const voice = latest ? voiceFor(latest.speaker) : null;
  const ticker = useMemo(
    () =>
      latest
        ? [latest.finalText, latest.interimText].filter(Boolean).join(" ")
        : "Listening…",
    [latest],
  );

  return (
    <main className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden bg-festival-cream p-4 text-festival-ink">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-poster">
        <div>
          <p className="font-display text-2xl font-bold uppercase tracking-[0.05em]">
            Captions lab
          </p>
          <p className="text-sm opacity-70">
            Try Both and Highlight layouts with sample talk. Live TVs are unchanged — open{" "}
            <code>/captions</code> for the real screen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Layout variant">
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={variant === v.id}
              title={v.blurb}
              onClick={() => setVariant(v.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                variant === v.id
                  ? "bg-festival-forest text-festival-cream"
                  : "bg-festival-forest/10 hover:bg-festival-forest/20"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </header>

      <section
        aria-label={VARIANTS.find((v) => v.id === variant)?.label}
        className="min-h-0 overflow-hidden rounded-[1.5rem] border-2 border-festival-green bg-festival-cream"
      >
        {(variant === "both-side" || variant === "both-stack") && (
          <BothPreview
            stacked={variant === "both-stack"}
            ticker={ticker}
            voiceSrc={voice?.emojiSrc}
          />
        )}
        {(variant === "highlight-plain" || variant === "highlight-soft") && (
          <HighlightPreview soft={variant === "highlight-soft"} ticker={ticker} voiceSrc={voice?.emojiSrc} />
        )}
      </section>
    </main>
  );
}

function BothPreview({
  stacked,
  ticker,
  voiceSrc,
}: {
  stacked: boolean;
  ticker: string;
  voiceSrc?: string;
}) {
  return (
    <div className={`flex h-full ${stacked ? "flex-col" : "flex-row"} gap-3 p-3`}>
      <div
        className={`garden-frame relative overflow-hidden rounded-[1.25rem] border-2 border-festival-green bg-[radial-gradient(circle_at_50%_80%,#d8e4c8,transparent_55%),linear-gradient(#f4f1ea,#e8f0db)] ${
          stacked ? "min-h-0 flex-[1.4]" : "min-w-0 flex-[1.4]"
        }`}
      >
        <p className="absolute left-4 top-3 text-sm font-semibold uppercase tracking-wide text-festival-forest/80">
          Garden (sample)
        </p>
        <div className="absolute inset-0 flex items-end justify-around px-8 pb-10">
          <span className="size-10 rounded-full bg-festival-forest/35" />
          <span className="mb-6 size-14 rounded-full bg-festival-green/70" />
          <span className="size-12 rounded-full bg-festival-marigold/60" />
        </div>
      </div>
      <div className={`min-h-0 min-w-0 ${stacked ? "flex-[0.9]" : "flex-1"}`}>
        {stacked ? (
          <div className="flex h-full items-center gap-3 rounded-2xl bg-white/70 px-4 shadow-poster">
            {voiceSrc && (
              <Image src={voiceSrc} alt="" width={40} height={40} unoptimized className="h-8 w-8" />
            )}
            <p className="line-clamp-2 text-2xl font-medium leading-snug">{ticker}</p>
            <AudienceQr className="ml-auto h-20 shrink-0 text-sm" />
          </div>
        ) : (
          <CaptionColumn
            className="h-full text-[clamp(1.2rem,2vw,2.2rem)] font-medium"
            bubbles={LAB_BUBBLES}
            speakerColoursOn
            emptyMessage=""
          />
        )}
      </div>
    </div>
  );
}

function HighlightPreview({
  soft,
  ticker,
  voiceSrc,
}: {
  soft: boolean;
  ticker: string;
  voiceSrc?: string;
}) {
  return (
    <div
      className={`relative flex h-full flex-col justify-between p-[3vh_3vw] ${
        soft
          ? "bg-[radial-gradient(ellipse_at_center,#e8f0db_0%,#f4f1ea_55%,#f4f1ea_100%)]"
          : "bg-festival-cream"
      }`}
    >
      <p className="font-display text-[clamp(1.4rem,2.4vw,2.8rem)] font-bold uppercase tracking-[0.05em]">
        Discussion Garden
      </p>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="font-bold uppercase tracking-[0.14em] text-festival-forest">Now discussing</p>
        <h2 className="max-w-[85vw] text-balance font-display text-[clamp(2rem,4.5vw,5.5rem)] font-semibold italic leading-[1.08]">
          {LAB_QUESTION}
        </h2>
        <p className="text-[clamp(1.1rem,1.8vw,2rem)] font-semibold opacity-75">{LAB_TITLE}</p>
        <p className="rounded-2xl bg-white/70 px-4 py-2 text-[clamp(1rem,1.5vw,1.6rem)] shadow-poster">
          UP NEXT · {LAB_NEXT}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-[clamp(1.1rem,1.8vw,2rem)] shadow-poster">
          {voiceSrc && (
            <Image src={voiceSrc} alt="" width={40} height={40} unoptimized className="h-[1em] w-[1em]" />
          )}
          <p className="truncate font-medium">{ticker}</p>
        </div>
        <AudienceQr className="h-24 shrink-0 text-sm" />
      </div>
    </div>
  );
}
