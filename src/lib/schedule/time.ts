// Venue clock (assumed Eastern — confirm). Oct 17–18, 2026 are EDT, before DST ends on Nov 1.
export const VENUE_TIME_ZONE = "America/Toronto";
export const VENUE_UTC_OFFSET = "-04:00";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VENUE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "11:00" in venue time, or "" when there's no (valid) time. Same result on any device clock. */
export function venueTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : formatter.format(date);
}

/** Combine a festival day ("2026-10-17") and an `<input type="time">` value ("11:00") into a timestamp. */
export function toVenueIso(day: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return `${day}T${time}:00${VENUE_UTC_OFFSET}`;
}
