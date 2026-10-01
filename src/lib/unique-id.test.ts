import { afterEach, describe, expect, it, vi } from "vitest";
import { uniqueId } from "./unique-id";

describe("uniqueId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses randomUUID when available", () => {
    expect(uniqueId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("still works without randomUUID (plain-http pages)", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => real.getRandomValues(a) });
    const ids = new Set(Array.from({ length: 50 }, uniqueId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});
