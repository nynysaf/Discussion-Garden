import { describe, expect, it } from "vitest";
import { inquiryLengthBucket } from "./inquiry-fit";

describe("inquiryLengthBucket", () => {
  it("classifies by character count", () => {
    expect(inquiryLengthBucket("Short?")).toBe("short");
    expect(inquiryLengthBucket("x".repeat(50))).toBe("medium");
    expect(inquiryLengthBucket("x".repeat(100))).toBe("long");
    expect(inquiryLengthBucket("x".repeat(160))).toBe("xl");
  });
});
