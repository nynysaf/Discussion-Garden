import { describe, expect, it } from "vitest";
import {
  availableViews,
  bandShare,
  bandUnder,
  refitPlan,
  cleanRotation,
  clampRotateSeconds,
  currentView,
  effectiveView,
  nextRotation,
  type ViewSettings,
} from "./layout";

const ALL = { gardenHidden: false, hasHighlight: true };
const SINCE = "2026-10-17T15:00:00.000Z";
const at = (seconds: number) => Date.parse(SINCE) + seconds * 1000;

function settings(patch: Partial<ViewSettings> = {}): ViewSettings {
  return {
    selected: "both",
    rotation: ["garden", "both", "captions", "highlight"],
    rotateSeconds: null,
    rotateSince: null,
    ...patch,
  };
}

describe("availableViews", () => {
  it("offers all four views normally", () => {
    expect(availableViews(ALL)).toEqual(["garden", "both", "captions", "highlight"]);
  });
  it("drops the garden views while the garden is hidden", () => {
    expect(availableViews({ gardenHidden: true, hasHighlight: true })).toEqual(["captions", "highlight"]);
  });
  it("drops Highlight when there is nothing live or coming up", () => {
    expect(availableViews({ gardenHidden: false, hasHighlight: false })).toEqual(["garden", "both", "captions"]);
  });
});

describe("effectiveView", () => {
  it("keeps an available view", () => {
    expect(effectiveView("garden", ALL)).toBe("garden");
  });
  it("falls back to Captions when the garden is hidden", () => {
    expect(effectiveView("garden", { gardenHidden: true, hasHighlight: true })).toBe("captions");
    expect(effectiveView("both", { gardenHidden: true, hasHighlight: true })).toBe("captions");
  });
  it("falls back to Both when Highlight has nothing to show", () => {
    expect(effectiveView("highlight", { gardenHidden: false, hasHighlight: false })).toBe("both");
  });
});

describe("currentView", () => {
  it("shows the selected view when auto-rotate is off", () => {
    expect(currentView(at(500), settings({ selected: "captions" }), ALL)).toBe("captions");
  });

  it("steps through the playlist from the selected view", () => {
    const s = settings({ selected: "both", rotateSeconds: 20, rotateSince: SINCE });
    expect(currentView(at(0), s, ALL)).toBe("both");
    expect(currentView(at(19.9), s, ALL)).toBe("both");
    expect(currentView(at(20), s, ALL)).toBe("captions");
    expect(currentView(at(40), s, ALL)).toBe("highlight");
    expect(currentView(at(60), s, ALL)).toBe("garden");
    expect(currentView(at(80), s, ALL)).toBe("both");
  });

  it("only rotates through ticked views", () => {
    const s = settings({ selected: "garden", rotation: ["garden", "highlight"], rotateSeconds: 15, rotateSince: SINCE });
    expect([0, 15, 30].map((t) => currentView(at(t), s, ALL))).toEqual(["garden", "highlight", "garden"]);
  });

  it("starts at the next ticked view when the selected one isn't ticked", () => {
    const s = settings({ selected: "both", rotation: ["garden", "captions"], rotateSeconds: 15, rotateSince: SINCE });
    expect(currentView(at(0), s, ALL)).toBe("captions");
    expect(currentView(at(15), s, ALL)).toBe("garden");
  });

  it("skips views that aren't available right now", () => {
    const s = settings({ selected: "garden", rotateSeconds: 10, rotateSince: SINCE });
    const hidden = { gardenHidden: true, hasHighlight: true };
    expect([0, 10, 20].map((t) => currentView(at(t), s, hidden))).toEqual(["captions", "highlight", "captions"]);
  });

  it("holds still when fewer than two ticked views are available", () => {
    const s = settings({ selected: "both", rotation: ["both", "garden"], rotateSeconds: 10, rotateSince: SINCE });
    expect(currentView(at(10), s, { gardenHidden: true, hasHighlight: true })).toBe("captions");
  });

  it("treats a clock slightly behind the anchor as time zero", () => {
    const s = settings({ selected: "captions", rotateSeconds: 10, rotateSince: SINCE });
    expect(currentView(at(-3), s, ALL)).toBe("captions");
  });
});

describe("nextRotation", () => {
  it("is null when not rotating", () => {
    expect(nextRotation(at(5), settings(), ALL)).toBeNull();
  });
  it("counts down to the next view", () => {
    const s = settings({ selected: "garden", rotateSeconds: 20, rotateSince: SINCE });
    expect(nextRotation(at(8), s, ALL)).toEqual({ inSeconds: 12, view: "both" });
    expect(nextRotation(at(79), s, ALL)).toEqual({ inSeconds: 1, view: "garden" });
  });
});

describe("helpers", () => {
  it("cleanRotation keeps valid views once, in canonical order", () => {
    expect(cleanRotation(["highlight", "x", "garden", "garden"])).toEqual(["garden", "highlight"]);
    expect(cleanRotation(null)).toEqual([]);
  });
  it("clampRotateSeconds keeps 10–120", () => {
    expect(clampRotateSeconds(3)).toBe(10);
    expect(clampRotateSeconds(500)).toBe(120);
    expect(clampRotateSeconds(25.4)).toBe(25);
    expect(clampRotateSeconds(Number.NaN)).toBe(20);
  });
  it("bandShare splits the middle band", () => {
    expect(bandShare("both")).toEqual({ garden: 0.58, captions: 0.42 });
    expect(bandShare("garden")).toEqual({ garden: 1, captions: 0 });
    expect(bandShare("captions")).toEqual({ garden: 0, captions: 1 });
  });
});

describe("bandUnder", () => {
  it("follows the view, and holds the last band under Highlight", () => {
    expect(bandUnder("garden", "both", ALL)).toBe("garden");
    expect(bandUnder("highlight", "garden", ALL)).toBe("garden");
  });
  it("swaps a hidden garden for Captions under Highlight", () => {
    expect(bandUnder("highlight", "both", { gardenHidden: true, hasHighlight: true })).toBe("captions");
  });
});

describe("refitPlan", () => {
  it("Both → Garden: garden grows after the slide; captions slide away untouched", () => {
    expect(refitPlan({ garden: "both", captions: "both" }, "garden")).toEqual({
      now: { garden: "both", captions: "both" },
      afterSlide: { garden: "garden", captions: "both" },
    });
  });
  it("Garden → Both: garden shrinks first, captions slide back in at their old size", () => {
    expect(refitPlan({ garden: "garden", captions: "both" }, "both")).toEqual({
      now: { garden: "both", captions: "both" },
      afterSlide: { garden: "both", captions: "both" },
    });
  });
  it("Both → Captions: captions widen after the slide", () => {
    expect(refitPlan({ garden: "both", captions: "both" }, "captions")).toEqual({
      now: { garden: "both", captions: "both" },
      afterSlide: { garden: "both", captions: "captions" },
    });
  });
  it("Captions → Garden: captions keep their fit while sliding out, garden grows after", () => {
    expect(refitPlan({ garden: "both", captions: "captions" }, "garden")).toEqual({
      now: { garden: "both", captions: "captions" },
      afterSlide: { garden: "garden", captions: "captions" },
    });
  });
});
