export type CaptionsFooter = "schedule" | "inquiry";

export const FOOTER_ROTATE_MS = 10_000;

export function isCaptionsFooter(value: unknown): value is CaptionsFooter {
  return value === "schedule" || value === "inquiry";
}

/**
 * Bottom banner on Both/Captions: always alternates every 10s while a live
 * inquiry is on; otherwise stays on the schedule strip. Independent of the
 * view auto-rotate playlist. Uses wall-clock so every TV stays in step.
 */
export function rotatingFooter(nowMs: number, hasLiveInquiry: boolean): CaptionsFooter {
  if (!hasLiveInquiry) return "schedule";
  return Math.floor(nowMs / FOOTER_ROTATE_MS) % 2 === 0 ? "schedule" : "inquiry";
}

/** @deprecated prefer rotatingFooter — kept for older call sites during migration */
export function effectiveFooter(
  preferred: CaptionsFooter,
  hasLiveQuestion: boolean,
): CaptionsFooter {
  if (preferred === "inquiry" && !hasLiveQuestion) return "schedule";
  return preferred;
}
