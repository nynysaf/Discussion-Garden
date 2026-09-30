import { describe, expect, it } from "vitest";
import { loginHref, safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("allows host pages", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("/admin/garden?tab=drafts")).toBe("/admin/garden?tab=drafts");
  });

  it("falls back to /admin for anything else", () => {
    for (const bad of [
      null,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/captions",
      "/administrator",
    ]) {
      expect(safeNextPath(bad)).toBe("/admin");
    }
  });
});

describe("loginHref", () => {
  it("encodes the return path and optional error", () => {
    expect(loginHref("/admin")).toBe("/login?next=%2Fadmin");
    expect(loginHref("/admin", "not-host")).toBe("/login?next=%2Fadmin&error=not-host");
  });
});
