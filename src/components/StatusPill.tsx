import type { AudioStatus } from "@/lib/captions/types";

const STATUS: Record<AudioStatus, { label: string; classes: string }> = {
  idle: { label: "Not live", classes: "bg-festival-ink/10 text-festival-ink" },
  connecting: {
    label: "Connecting…",
    classes: "bg-festival-green text-festival-ink",
  },
  live: { label: "Live", classes: "bg-festival-forest text-festival-cream" },
  reconnecting: {
    label: "Reconnecting…",
    classes: "bg-festival-terracotta text-festival-ink",
  },
  paused: { label: "Paused", classes: "bg-festival-marigold text-festival-ink" },
  error: { label: "Problem", classes: "bg-festival-terracotta text-festival-ink" },
};

type Props = { status: AudioStatus; className?: string };

export function StatusPill({ status, className = "" }: Props) {
  const { label, classes } = STATUS[status];
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${classes} ${className}`}
    >
      {status === "live" && (
        <span aria-hidden className="h-2 w-2 rounded-full bg-festival-cream" />
      )}
      {label}
    </span>
  );
}
