import { describe, expect, it } from "vitest";
import { FOOTER_ROTATE_MS, isCaptionsFooter, rotatingFooter } from "./footer";

describe("rotatingFooter", () => {
  it("stays on schedule with no live inquiry", () => {
    expect(rotatingFooter(0, false)).toBe("schedule");
    expect(rotatingFooter(FOOTER_ROTATE_MS * 3, false)).toBe("schedule");
  });

  it("alternates every 10 seconds when an inquiry is live", () => {
    expect(rotatingFooter(0, true)).toBe("schedule");
    expect(rotatingFooter(FOOTER_ROTATE_MS - 1, true)).toBe("schedule");
    expect(rotatingFooter(FOOTER_ROTATE_MS, true)).toBe("inquiry");
    expect(rotatingFooter(FOOTER_ROTATE_MS * 2, true)).toBe("schedule");
  });
});

describe("isCaptionsFooter", () => {
  it("accepts only the two modes", () => {
    expect(isCaptionsFooter("schedule")).toBe(true);
    expect(isCaptionsFooter("inquiry")).toBe(true);
    expect(isCaptionsFooter("rotate")).toBe(false);
  });
});
