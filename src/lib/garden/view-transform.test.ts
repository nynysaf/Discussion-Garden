import { describe, expect, it } from "vitest";
import { clampZoom, EXPLORE_VIEW_MIN_K, fitBounds, fitView, zoomAroundPoint } from "./view-transform";

describe("view-transform", () => {
  it("clamps zoom", () => {
    expect(clampZoom(0.01)).toBe(0.4);
    expect(clampZoom(9)).toBe(2.5);
    expect(clampZoom(0.01, EXPLORE_VIEW_MIN_K)).toBe(EXPLORE_VIEW_MIN_K);
  });

  it("keeps the point under the cursor when zooming", () => {
    const view = { x: 0, y: 0, k: 1 };
    const next = zoomAroundPoint(view, 100, 50, 2);
    // World point that was at screen (100,50) stays there.
    expect(100 - next.x).toBeCloseTo((100 - view.x) * (next.k / view.k));
    expect(50 - next.y).toBeCloseTo((50 - view.y) * (next.k / view.k));
  });

  it("fits the world into the viewport", () => {
    const v = fitView(2000, 1000, 1000, 500, 0);
    expect(v.k).toBe(0.5);
  });

  it("fits a node bounding box around the viewport centre", () => {
    const v = fitBounds(100, 50, 500, 250, 800, 400, 0, 0.1);
    expect(v.k).toBe(2);
    expect(v.x).toBeCloseTo(800 / 2 - 300 * 2);
    expect(v.y).toBeCloseTo(400 / 2 - 150 * 2);
  });
});
