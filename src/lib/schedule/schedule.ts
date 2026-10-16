import type { FestivalSession, ScheduleItem } from "@/lib/realtime/festival-state";
import { venueCalendarDate } from "./time";

export const TITLE_MAX = 80;
export const QUESTION_MAX = 200;

/** One day's items in running order. */
export function dayItems(schedule: ScheduleItem[], sessionId: string | null): ScheduleItem[] {
  if (!sessionId) return [];
  return schedule
    .filter((item) => item.sessionId === sessionId)
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
}

/** All schedule blocks in clock order (across both festival days) for Now · Next. */
export function timedItems(schedule: ScheduleItem[]): ScheduleItem[] {
  return [...schedule].sort(
    (a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? "") || a.sortOrder - b.sortOrder,
  );
}

/**
 * Festival session whose `date` matches the venue calendar today.
 * Friday before the garden opens → null (TVs still show Saturday as UP NEXT via timedItems).
 */
export function sessionForClock(
  sessions: FestivalSession[],
  nowMs: number,
): FestivalSession | null {
  const today = venueCalendarDate(nowMs);
  return sessions.find((s) => s.date === today) ?? null;
}

/**
 * "Now" = the latest item whose `starts_at` is ≤ the venue/computer clock.
 * "Next" = the following item in running order. Items without a time never become Now;
 * if nothing has started yet, Now is empty and Next is the first item.
 * Pass `timedItems(schedule)` so Friday can show Saturday morning as UP NEXT.
 */
export function nowAndNext(
  items: ScheduleItem[],
  nowMs: number,
): { now: ScheduleItem | null; next: ScheduleItem | null } {
  if (items.length === 0) return { now: null, next: null };

  let nowIndex = -1;
  for (let i = 0; i < items.length; i++) {
    const startsAt = items[i].startsAt;
    if (!startsAt) continue;
    const t = Date.parse(startsAt);
    if (!Number.isNaN(t) && t <= nowMs) nowIndex = i;
  }

  if (nowIndex < 0) return { now: null, next: items[0] ?? null };
  return { now: items[nowIndex], next: items[nowIndex + 1] ?? null };
}

export type SortUpdate = { id: string; sortOrder: number };

/** Swap an item with its neighbour; returns only the rows whose sort order actually changes. */
export function moveItem(items: ScheduleItem[], id: string, direction: -1 | 1): SortUpdate[] {
  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return [];
  const reordered = [...items];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered
    .map((item, i) => ({ id: item.id, sortOrder: i + 1, was: item.sortOrder }))
    .filter((u) => u.sortOrder !== u.was)
    .map(({ id: itemId, sortOrder }) => ({ id: itemId, sortOrder }));
}

export function nextSortOrder(items: ScheduleItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
}

export type ScheduleDraft = { title: string; question: string; time: string };

export type ValidDraft = { title: string; question: string | null; time: string | null };

export function validateDraft(
  draft: ScheduleDraft,
): { ok: true; value: ValidDraft } | { ok: false; error: string } {
  const title = draft.title.trim();
  const question = draft.question.trim();
  const time = draft.time.trim();
  if (!title) return { ok: false, error: "Give the item a title." };
  if (title.length > TITLE_MAX) return { ok: false, error: `Title is over ${TITLE_MAX} characters.` };
  if (question.length > QUESTION_MAX) {
    return { ok: false, error: `Question is over ${QUESTION_MAX} characters — keep it TV-sized.` };
  }
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { ok: false, error: "Time should look like 13:30." };
  }
  return { ok: true, value: { title, question: question || null, time: time || null } };
}
