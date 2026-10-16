export type CaptionsFooter = "schedule" | "inquiry";

export function isCaptionsFooter(value: unknown): value is CaptionsFooter {
  return value === "schedule" || value === "inquiry";
}

/**
 * Inquiry needs a live question on the TVs. With none, stay on the schedule strip
 * even if the host left the picker on Inquiry.
 */
export function effectiveFooter(
  preferred: CaptionsFooter,
  hasLiveQuestion: boolean,
): CaptionsFooter {
  if (preferred === "inquiry" && !hasLiveQuestion) return "schedule";
  return preferred;
}
