import Image from "next/image";
import type { CaptionBubble } from "@/lib/captions/types";
import { voiceFor, type ColourSlot } from "@/lib/captions/voice-slot";

const SLOT_CLASSES: Record<ColourSlot, string> = {
  1: "bg-voice-1-tint border-voice-1",
  2: "bg-voice-2-tint border-voice-2",
  3: "bg-voice-3-tint border-voice-3",
  4: "bg-voice-4-tint border-voice-4",
  5: "bg-voice-5-tint border-voice-5",
  6: "bg-voice-6-tint border-voice-6 border-dashed",
};

type Props = {
  bubble: CaptionBubble;
  speakerColoursOn: boolean;
};

export function CaptionBubbleView({ bubble, speakerColoursOn }: Props) {
  const voice = voiceFor(bubble.speaker);
  const spoken = [bubble.finalText, bubble.interimText].filter(Boolean).join(" ");
  const indent = speakerColoursOn && bubble.speaker % 2 === 1;

  const colourClasses = speakerColoursOn
    ? `border-l-[6px] ${SLOT_CLASSES[voice.colourSlot]}`
    : "border border-festival-green bg-festival-cream";

  return (
    <li
      aria-label={speakerColoursOn ? `${voice.animal}: ${spoken}` : spoken}
      className={`bubble-enter flex items-start gap-[0.4em] rounded-2xl px-[0.6em] py-[0.35em] leading-[1.35] text-festival-ink shadow-poster ${colourClasses} ${indent ? "ml-[8%]" : "mr-[8%]"}`}
    >
      {speakerColoursOn && (
        <Image
          src={voice.emojiSrc}
          alt=""
          aria-hidden
          width={48}
          height={48}
          unoptimized
          className="mt-[0.15em] h-[0.95em] w-[0.95em] shrink-0"
        />
      )}
      <p className="min-w-0">
        {bubble.finalText}
        {bubble.finalText && bubble.interimText ? " " : null}
        {bubble.interimText && (
          <span className="opacity-60">{bubble.interimText}</span>
        )}
      </p>
    </li>
  );
}
