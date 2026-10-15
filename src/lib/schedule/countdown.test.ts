import { describe, expect, it } from "vitest";
import { countdownLabel } from "./countdown";

const START = "2026-10-17T14:00:00-04:00";
const before = (minutes: number) => Date.parse(START) - minutes * 60_000;

describe("countdownLabel", () => {
  it("is null without a valid time", () => {
    expect(countdownLabel(null, before(5))).toBeNull();
    expect(countdownLabel("not a time", before(5))).toBeNull();
  });
  it("counts whole minutes, rounding up", () => {
    expect(countdownLabel(START, before(12))).toBe("Starts in 12 min");
    expect(countdownLabel(START, before(11.2))).toBe("Starts in 12 min");
  });
  it("says 'Starting soon' in the last minute and once the time has passed", () => {
    expect(countdownLabel(START, before(0.5))).toBe("Starting soon");
    expect(countdownLabel(START, before(-20))).toBe("Starting soon");
  });
  it("uses hours for longer waits and stops past six hours", () => {
    expect(countdownLabel(START, before(65))).toBe("Starts in 1 h 5 min");
    expect(countdownLabel(START, before(120))).toBe("Starts in 2 h");
    expect(countdownLabel(START, before(6 * 60))).toBeNull();
  });
});
