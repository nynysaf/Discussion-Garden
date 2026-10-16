import { describe, expect, it } from "vitest";
import { clampFontScale, fontScaleFactor, FONT_SCALE_DEFAULT } from "./font-scale";

describe("clampFontScale", () => {
  it("keeps values in range on a 5% grid", () => {
    expect(clampFontScale(100)).toBe(100);
    expect(clampFontScale(77)).toBe(75);
    expect(clampFontScale(173)).toBe(175);
    expect(clampFontScale(112)).toBe(110);
  });

  it("falls back for bad input", () => {
    expect(clampFontScale(Number.NaN)).toBe(FONT_SCALE_DEFAULT);
  });
});

describe("fontScaleFactor", () => {
  it("turns percent into a CSS multiplier", () => {
    expect(fontScaleFactor(100)).toBe(1);
    expect(fontScaleFactor(150)).toBe(1.5);
  });
});
