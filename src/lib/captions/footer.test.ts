import { describe, expect, it } from "vitest";
import { effectiveFooter, isCaptionsFooter } from "./footer";

describe("effectiveFooter", () => {
  it("keeps inquiry only when something is live", () => {
    expect(effectiveFooter("inquiry", true)).toBe("inquiry");
    expect(effectiveFooter("inquiry", false)).toBe("schedule");
    expect(effectiveFooter("schedule", false)).toBe("schedule");
  });
});

describe("isCaptionsFooter", () => {
  it("accepts only the two modes", () => {
    expect(isCaptionsFooter("schedule")).toBe(true);
    expect(isCaptionsFooter("inquiry")).toBe(true);
    expect(isCaptionsFooter("rotate")).toBe(false);
  });
});
