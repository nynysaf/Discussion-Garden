import { describe, expect, it } from "vitest";
import type { FestivalSession, ScheduleItem } from "@/lib/realtime/festival-state";
import {
  dayItems,
  moveItem,
  nextSortOrder,
  nowAndNext,
  sessionForClock,
  timedItems,
  validateDraft,
} from "./schedule";
import { toVenueIso, venueCalendarDate, venueTime } from "./time";

const item = (id: string, sortOrder: number, sessionId = "d1", startsAt: string | null = null): ScheduleItem => ({
  id,
  sessionId,
  title: `Item ${id}`,
  question: null,
  startsAt,
  sortOrder,
});

describe("venueTime", () => {
  it("shows venue time whatever the device clock", () => {
    expect(venueTime("2026-10-17T15:00:00+00:00")).toBe("11:00");
    expect(venueTime("2026-10-17 16:30-04")).toBe("16:30");
  });

  it("is empty for missing or broken times", () => {
    expect(venueTime(null)).toBe("");
    expect(venueTime("not a time")).toBe("");
  });
});

describe("toVenueIso", () => {
  it("pins a time input to the venue offset", () => {
    expect(toVenueIso("2026-10-18", "13:05")).toBe("2026-10-18T13:05:00-04:00");
    expect(venueTime(toVenueIso("2026-10-18", "13:05"))).toBe("13:05");
  });

  it("rejects malformed input", () => {
    expect(toVenueIso("2026-10-18", "25:00")).toBeNull();
    expect(toVenueIso("Oct 18", "13:00")).toBeNull();
  });
});

describe("venueCalendarDate", () => {
  it("returns the venue calendar day", () => {
    expect(venueCalendarDate(Date.parse("2026-10-16T20:00:00-04:00"))).toBe("2026-10-16");
    expect(venueCalendarDate(Date.parse("2026-10-17T00:30:00-04:00"))).toBe("2026-10-17");
  });
});

describe("sessionForClock", () => {
  const sessions: FestivalSession[] = [
    { id: "s1", slug: "day_1", title: "Saturday", date: "2026-10-17" },
    { id: "s2", slug: "day_2", title: "Sunday", date: "2026-10-18" },
  ];

  it("matches today's festival session and is null on other days", () => {
    expect(sessionForClock(sessions, Date.parse("2026-10-17T12:00:00-04:00"))?.id).toBe("s1");
    expect(sessionForClock(sessions, Date.parse("2026-10-18T09:00:00-04:00"))?.id).toBe("s2");
    expect(sessionForClock(sessions, Date.parse("2026-10-16T15:00:00-04:00"))).toBeNull();
  });
});

describe("dayItems", () => {
  it("keeps one day, in running order", () => {
    const schedule = [item("c", 3), item("x", 1, "d2"), item("a", 1), item("b", 2)];
    expect(dayItems(schedule, "d1").map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(dayItems(schedule, null)).toEqual([]);
  });

  it("breaks sort-order ties by start time", () => {
    const schedule = [item("late", 1, "d1", "2026-10-17T14:00:00Z"), item("early", 1, "d1", "2026-10-17T12:00:00Z")];
    expect(dayItems(schedule, "d1").map((i) => i.id)).toEqual(["early", "late"]);
  });
});

describe("nowAndNext", () => {
  const day = "2026-10-17";
  const timed = [
    item("a", 1, "d1", `${day}T11:00:00-04:00`),
    item("b", 2, "d1", `${day}T13:00:00-04:00`),
    item("c", 3, "d1", `${day}T15:00:00-04:00`),
  ];

  it("picks the latest item that has already started", () => {
    const before = Date.parse(`${day}T10:59:00-04:00`);
    expect(nowAndNext(timed, before)).toEqual({ now: null, next: timed[0] });

    const mid = Date.parse(`${day}T13:05:00-04:00`);
    expect(nowAndNext(timed, mid)).toEqual({ now: timed[1], next: timed[2] });

    const after = Date.parse(`${day}T16:00:00-04:00`);
    expect(nowAndNext(timed, after)).toEqual({ now: timed[2], next: null });
  });

  it("skips items without a start time when choosing Now", () => {
    const mixed = [item("untimed", 1), ...timed];
    const mid = Date.parse(`${day}T11:30:00-04:00`);
    expect(nowAndNext(mixed, mid)).toEqual({ now: timed[0], next: timed[1] });
  });

  it("handles an empty day", () => {
    expect(nowAndNext([], Date.now())).toEqual({ now: null, next: null });
  });

  it("on Friday shows Saturday morning as UP NEXT across both days", () => {
    const both = timedItems([
      item("sat", 1, "d1", "2026-10-17T11:00:00-04:00"),
      item("sun", 1, "d2", "2026-10-18T11:00:00-04:00"),
    ]);
    const friday = Date.parse("2026-10-16T15:00:00-04:00");
    expect(nowAndNext(both, friday)).toEqual({ now: null, next: both[0] });
  });
});

describe("timedItems", () => {
  it("orders every day's blocks by start time", () => {
    const schedule = [
      item("sun", 1, "d2", "2026-10-18T11:00:00-04:00"),
      item("sat-late", 2, "d1", "2026-10-17T16:00:00-04:00"),
      item("sat-early", 1, "d1", "2026-10-17T11:00:00-04:00"),
    ];
    expect(timedItems(schedule).map((i) => i.id)).toEqual(["sat-early", "sat-late", "sun"]);
  });
});

describe("moveItem", () => {
  it("swaps neighbours and only touches rows that change", () => {
    const items = [item("a", 1), item("b", 2), item("c", 3)];
    expect(moveItem(items, "c", -1)).toEqual([
      { id: "c", sortOrder: 2 },
      { id: "b", sortOrder: 3 },
    ]);
  });

  it("renumbers messy sort orders as it goes", () => {
    const items = [item("a", 0), item("b", 0), item("c", 7)];
    expect(moveItem(items, "a", 1)).toEqual([
      { id: "b", sortOrder: 1 },
      { id: "a", sortOrder: 2 },
      { id: "c", sortOrder: 3 },
    ]);
  });

  it("does nothing past either end", () => {
    const items = [item("a", 1), item("b", 2)];
    expect(moveItem(items, "a", -1)).toEqual([]);
    expect(moveItem(items, "b", 1)).toEqual([]);
    expect(moveItem(items, "zzz", 1)).toEqual([]);
  });
});

describe("nextSortOrder", () => {
  it("goes after the last item", () => {
    expect(nextSortOrder([])).toBe(1);
    expect(nextSortOrder([item("a", 4), item("b", 2)])).toBe(5);
  });
});

describe("validateDraft", () => {
  it("trims and turns blanks into null", () => {
    expect(validateDraft({ title: "  Opening  ", question: " ", time: "" })).toEqual({
      ok: true,
      value: { title: "Opening", question: null, time: null },
    });
  });

  it("needs a title and TV-sized text", () => {
    expect(validateDraft({ title: " ", question: "", time: "" }).ok).toBe(false);
    expect(validateDraft({ title: "x".repeat(81), question: "", time: "" }).ok).toBe(false);
    expect(validateDraft({ title: "ok", question: "q".repeat(201), time: "" }).ok).toBe(false);
  });

  it("checks the time format", () => {
    expect(validateDraft({ title: "ok", question: "", time: "9am" }).ok).toBe(false);
    expect(validateDraft({ title: "ok", question: "", time: "09:30" })).toMatchObject({
      ok: true,
      value: { time: "09:30" },
    });
  });
});
