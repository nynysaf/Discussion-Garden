import { describe, expect, it } from "vitest";
import { activeInquiry, validateInquiryBody } from "./inquiries";

describe("validateInquiryBody", () => {
  it("trims and accepts a normal question", () => {
    expect(validateInquiryBody("  How might we share tools?  ")).toEqual({
      ok: true,
      body: "How might we share tools?",
    });
  });

  it("rejects empty or too long", () => {
    expect(validateInquiryBody("   ").ok).toBe(false);
    expect(validateInquiryBody("x".repeat(201)).ok).toBe(false);
  });
});

describe("activeInquiry", () => {
  it("finds the live one", () => {
    const list = [
      {
        id: "a",
        body: "One",
        sessionId: null,
        createdAt: "",
        lastActivatedAt: null,
      },
      {
        id: "b",
        body: "Two",
        sessionId: null,
        createdAt: "",
        lastActivatedAt: null,
      },
    ];
    expect(activeInquiry(list, "b")?.body).toBe("Two");
    expect(activeInquiry(list, null)).toBeNull();
  });
});
