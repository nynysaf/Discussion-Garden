import { describe, expect, it } from "vitest";
import { paperWashes, paperWorldBounds } from "./paper-world";

describe("paper-world", () => {
  it("pads beyond the viewport so zoom-out stays on cream", () => {
    const b = paperWorldBounds(1000, 800);
    expect(b.width).toBeGreaterThan(1000);
    expect(b.height).toBeGreaterThan(800);
    expect(b.x).toBeLessThan(0);
  });

  it("returns deterministic washes", () => {
    expect(paperWashes(42, 5)).toEqual(paperWashes(42, 5));
    expect(paperWashes(42, 5)).toHaveLength(5);
  });
});
