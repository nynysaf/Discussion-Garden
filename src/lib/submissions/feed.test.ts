import { describe, expect, it } from "vitest";
import { roomFeed, toSubmission, type Submission } from "./feed";

const msg = (id: string, minute: number, hidden = false): Submission => ({
  id,
  body: `Made-up message ${id}`,
  nameTag: null,
  hidden,
  createdAt: `2026-10-17T15:${String(minute).padStart(2, "0")}:00Z`,
});

describe("toSubmission", () => {
  it("treats 'dismissed' as hidden and everything else as visible", () => {
    const base = { id: "a", body: "Hi", name_tag: "Fern", created_at: "2026-10-17T15:00:00Z" };
    expect(toSubmission({ ...base, status: "dismissed" }).hidden).toBe(true);
    expect(toSubmission({ ...base, status: "approved" })).toEqual({
      id: "a",
      body: "Hi",
      nameTag: "Fern",
      hidden: false,
      createdAt: "2026-10-17T15:00:00Z",
    });
  });
});

describe("roomFeed", () => {
  it("lists visible messages newest first with nothing pinned", () => {
    const feed = roomFeed([msg("a", 1), msg("b", 3), msg("c", 2)], null);
    expect(feed.pinned).toBeNull();
    expect(feed.others.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("pins the highlighted message and leaves it out of the list", () => {
    const feed = roomFeed([msg("a", 1), msg("b", 2), msg("c", 3)], "a");
    expect(feed.pinned?.id).toBe("a");
    expect(feed.others.map((s) => s.id)).toEqual(["c", "b"]);
  });

  it("never shows hidden messages, even if they were pinned", () => {
    const feed = roomFeed([msg("a", 1, true), msg("b", 2)], "a");
    expect(feed.pinned).toBeNull();
    expect(feed.others.map((s) => s.id)).toEqual(["b"]);
  });

  it("ignores a pin that points at a message it doesn't have", () => {
    expect(roomFeed([msg("a", 1)], "gone").pinned).toBeNull();
  });
});
