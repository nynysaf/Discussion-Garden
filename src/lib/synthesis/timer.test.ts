import { describe, expect, it } from "vitest";
import { shouldRunSynthesisTick } from "./timer";

const base = {
  audioStatus: "live",
  synthesisMode: "hybrid",
  holdingMic: true,
  busy: false,
};

describe("shouldRunSynthesisTick", () => {
  it("runs only while Live, Hybrid/Auto, holding the mic, and idle", () => {
    expect(shouldRunSynthesisTick(base)).toBe(true);
    expect(shouldRunSynthesisTick({ ...base, synthesisMode: "auto" })).toBe(true);
    expect(shouldRunSynthesisTick({ ...base, synthesisMode: "manual" })).toBe(false);
    expect(shouldRunSynthesisTick({ ...base, audioStatus: "paused" })).toBe(false);
    expect(shouldRunSynthesisTick({ ...base, holdingMic: false })).toBe(false);
    expect(shouldRunSynthesisTick({ ...base, busy: true })).toBe(false);
  });
});
