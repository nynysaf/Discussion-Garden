import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_LAYOUT, movePanel, parseBoardLayout } from "./board-layout";

describe("parseBoardLayout", () => {
  it("falls back to the default when storage is empty or broken", () => {
    expect(parseBoardLayout(null)).toEqual(DEFAULT_BOARD_LAYOUT);
    expect(parseBoardLayout("{")).toEqual(DEFAULT_BOARD_LAYOUT);
    expect(parseBoardLayout(JSON.stringify({ left: ["captions"], right: [] }))).toEqual(
      DEFAULT_BOARD_LAYOUT,
    );
  });

  it("keeps a complete custom layout", () => {
    const custom = {
      left: ["drafts", "captions"],
      right: ["inquiry", "tv", "schedule", "audience"],
    };
    expect(parseBoardLayout(JSON.stringify(custom))).toEqual(custom);
  });
});

describe("movePanel", () => {
  it("moves a panel into the other column", () => {
    const next = movePanel(DEFAULT_BOARD_LAYOUT, "inquiry", "left", 1);
    expect(next.left).toEqual(["captions", "inquiry", "tv", "schedule"]);
    expect(next.right).toEqual(["drafts", "audience"]);
  });

  it("reorders within the same column", () => {
    const next = movePanel(DEFAULT_BOARD_LAYOUT, "schedule", "left", 0);
    expect(next.left).toEqual(["schedule", "captions", "tv"]);
    expect(next.right).toEqual(DEFAULT_BOARD_LAYOUT.right);
  });
});
