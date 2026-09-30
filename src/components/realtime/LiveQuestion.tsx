import type { ScheduleItem } from "@/lib/realtime/festival-state";

/** Marigold pill with the host's active question (DESIGN_GUIDE live-question style). */
export function LiveQuestion({
  item,
  className = "",
}: {
  item: ScheduleItem | null;
  className?: string;
}) {
  const text = item?.question || item?.title;
  if (!text) return null;
  return (
    <p
      className={`rounded-full bg-festival-marigold px-[1.2em] py-[0.4em] font-display font-semibold italic text-festival-ink ${className}`}
    >
      {text}
    </p>
  );
}
