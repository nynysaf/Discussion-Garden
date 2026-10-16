/**
 * "Starts in 12 min" for the Highlight screen. Null when there's no time or it's too far off
 * to be useful (e.g. tomorrow's first item); "Starting soon" once the time is (nearly) here.
 * Now · Next itself follows the computer/venue clock from each item's start time.
 */
export function countdownLabel(startsAt: string | null, nowMs: number): string | null {
  if (!startsAt) return null;
  const start = Date.parse(startsAt);
  if (Number.isNaN(start)) return null;
  const minutes = Math.ceil((start - nowMs) / 60_000);
  if (minutes <= 1) return "Starting soon";
  if (minutes < 60) return `Starts in ${minutes} min`;
  if (minutes >= 6 * 60) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `Starts in ${hours} h ${rest} min` : `Starts in ${hours} h`;
}
