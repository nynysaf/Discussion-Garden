import { describe, expect, it } from "vitest";
import { clampDensity, DENSITY_DEFAULT, forcesForDensity } from "./density";

describe("forcesForDensity", () => {
  it("defaults to the midpoint of the slider", () => {
    expect(DENSITY_DEFAULT).toBe(50);
  });

  it("clumps at 0 (attract / short vines / strong centre)", () => {
    const f = forcesForDensity(0);
    expect(f.charge).toBeGreaterThan(0);
    expect(f.linkGrow).toBeLessThan(40);
    expect(f.center).toBeGreaterThan(0.8);
  });

  it("matches the previous loose layout at 100", () => {
    const f = forcesForDensity(100);
    expect(f.charge).toBe(-820);
    expect(f.linkGrow).toBe(280);
    expect(f.linkRelate).toBe(380);
    expect(f.center).toBeCloseTo(0.05);
    expect(f.seedSpread).toBe(120);
  });

  it("puts 50 halfway between tight and loose", () => {
    const a = forcesForDensity(0);
    const b = forcesForDensity(100);
    const mid = forcesForDensity(50);
    expect(mid.charge).toBeCloseTo((a.charge + b.charge) / 2);
    expect(mid.linkGrow).toBeCloseTo((a.linkGrow + b.linkGrow) / 2);
  });

  it("clamps out-of-range values", () => {
    expect(clampDensity(-10)).toBe(0);
    expect(clampDensity(140)).toBe(100);
    expect(forcesForDensity(999).charge).toBe(forcesForDensity(100).charge);
  });
});
