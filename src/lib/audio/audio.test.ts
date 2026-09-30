import { describe, expect, it } from "vitest";
import { backoffDelayMs } from "./backoff";
import { rmsLevel } from "./level";
import { pickRecorderMimeType } from "./recorder-mime";

describe("rmsLevel", () => {
  it("is 0 for silence or no samples", () => {
    expect(rmsLevel([])).toBe(0);
    expect(rmsLevel([0, 0, 0])).toBe(0);
  });

  it("rises with loudness and caps at 1", () => {
    expect(rmsLevel([0.05, -0.05])).toBeCloseTo(0.2);
    expect(rmsLevel([1, -1])).toBe(1);
  });
});

describe("backoffDelayMs", () => {
  it("doubles each attempt up to the cap", () => {
    expect([0, 1, 2, 3, 4, 10].map((a) => backoffDelayMs(a))).toEqual([
      1000, 2000, 4000, 8000, 10000, 10000,
    ]);
  });

  it("treats bad input as the first attempt", () => {
    expect(backoffDelayMs(-3)).toBe(1000);
  });
});

describe("pickRecorderMimeType", () => {
  it("prefers webm/opus (Chrome, Edge)", () => {
    expect(pickRecorderMimeType(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("falls back to mp4 (Safari)", () => {
    expect(pickRecorderMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
  });

  it("returns undefined when nothing matches", () => {
    expect(pickRecorderMimeType(() => false)).toBeUndefined();
  });
});
