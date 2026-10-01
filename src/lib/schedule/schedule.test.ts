import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "@/lib/realtime/festival-state";
import { dayItems, moveItem, nextSortOrder, nowAndNext, validateDraft } from "./schedule";
import { toVenueIso, venueTime } from "./time";

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
  const items = [item("a", 1), item("b", 2), item("c", 3)];

  it("follows the host's live item", () => {
    expect(nowAndNext(items, "b")).toEqual({ now: items[1], next: items[2] });
    expect(nowAndNext(items, "c")).toEqual({ now: items[2], next: null });
  });

  it("shows the first item as next when nothing is live", () => {
    expect(nowAndNext(items, null)).toEqual({ now: null, next: items[0] });
    expect(nowAndNext(items, "other-day")).toEqual({ now: null, next: items[0] });
    expect(nowAndNext([], null)).toEqual({ now: null, next: null });
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
