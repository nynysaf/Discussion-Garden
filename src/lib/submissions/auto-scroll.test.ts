import { describe, expect, it } from "vitest";
import { AUTO_SCROLL_START, stepAutoScroll, type AutoScrollOptions } from "./auto-scroll";

const opts: AutoScrollOptions = { speedPxPerSec: 100, holdTopMs: 1_000, holdBottomMs: 500 };

function run(frames: number, dtMs: number, maxOffset: number) {
  let state = AUTO_SCROLL_START;
  for (let i = 0; i < frames; i++) state = stepAutoScroll(state, dtMs, maxOffset, opts);
  return state;
}

describe("stepAutoScroll", () => {
  it("never moves when the list fits", () => {
    expect(run(100, 100, 0)).toEqual(AUTO_SCROLL_START);
    expect(run(100, 100, -20)).toEqual(AUTO_SCROLL_START);
  });

  it("holds at the top before scrolling", () => {
    expect(run(9, 100, 300)).toMatchObject({ phase: "hold-top", offset: 0 });
    expect(run(10, 100, 300)).toMatchObject({ phase: "scrolling", offset: 0 });
  });

  it("scrolls at the set speed", () => {
    // 10 frames of hold, then 10 × 100ms at 100px/s = 100px.
    expect(run(20, 100, 300)).toMatchObject({ phase: "scrolling", offset: 100 });
  });

  it("stops exactly at the bottom, holds, then returns to the top", () => {
    expect(run(40, 100, 300)).toMatchObject({ phase: "hold-bottom", offset: 300 });
    expect(run(44, 100, 300)).toMatchObject({ phase: "hold-bottom", offset: 300 });
    expect(run(45, 100, 300)).toEqual(AUTO_SCROLL_START);
  });

  it("clamps if the list shrinks while holding at the bottom", () => {
    const atBottom = { phase: "hold-bottom" as const, offset: 300, heldMs: 0 };
    expect(stepAutoScroll(atBottom, 10, 120, opts).offset).toBe(120);
  });

  it("ignores negative frame times (clock hiccups)", () => {
    expect(stepAutoScroll(AUTO_SCROLL_START, -500, 300, opts)).toEqual(AUTO_SCROLL_START);
  });
});
