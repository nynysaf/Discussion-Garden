import type { CaptionBubble } from "@/lib/captions/types";
import { CaptionBubbleView } from "./CaptionBubbleView";

type Props = {
  bubbles: CaptionBubble[];
  speakerColoursOn: boolean;
  emptyMessage: string;
  className?: string;
};

/** Newest bubble at the bottom; older ones rise and fade at the top. */
export function CaptionColumn({
  bubbles,
  speakerColoursOn,
  emptyMessage,
  className = "",
}: Props) {
  return (
    <div
      className={`fade-top flex min-h-0 flex-col justify-end overflow-hidden ${className}`}
      aria-live="polite"
      aria-relevant="additions"
    >
      {bubbles.length === 0 ? (
        <p className="pb-2 italic opacity-50">{emptyMessage}</p>
      ) : (
        <ol className="flex flex-col gap-[0.45em]">
          {bubbles.map((bubble) => (
            <CaptionBubbleView
              key={bubble.id}
              bubble={bubble}
              speakerColoursOn={speakerColoursOn}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
