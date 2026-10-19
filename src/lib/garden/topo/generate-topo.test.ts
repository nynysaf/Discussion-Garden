import { describe, expect, it } from "vitest";
import { generateTopoWorld, worldBoundsForViewport } from "./generate-topo";
import { PLANT_PALETTE } from "./palettes";

describe("generateTopoWorld (Clara)", () => {
  it("pads the world beyond the viewport", () => {
    const b = worldBoundsForViewport(1000, 800);
    expect(b.width).toBeGreaterThan(1000);
    expect(b.originX).toBeLessThan(0);
  });

  it("builds washes + contour path deterministically", () => {
    const a = generateTopoWorld({
      originX: -100,
      originY: -80,
      width: 1200,
      height: 900,
      seed: "test",
      palette: PLANT_PALETTE,
    });
    const b = generateTopoWorld({
      originX: -100,
      originY: -80,
      width: 1200,
      height: 900,
      seed: "test",
      palette: PLANT_PALETTE,
    });
    expect(a.washes.length).toBe(7);
    expect(a.contourPath.length).toBeGreaterThan(100);
    expect(a.contourPath).toBe(b.contourPath);
    expect(a.palette.base).toBe("#D5E6D2");
  });
});
