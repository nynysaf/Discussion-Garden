import { describe, expect, it } from "vitest";
import { containsProfanity } from "./profanity";
import { checkRateLimit, DEVICE_RULES, FLOOD_RULES, lookbackMs } from "./rate-limit";
import { BODY_MAX, cleanText, NAME_TAG_MAX, validateSubmission } from "./validate";

const clean = () => false;

describe("cleanText", () => {
  it("trims and squashes spaces and blank lines", () => {
    expect(cleanText("  hello   there \r\n\r\n\r\n\r\n next  ")).toBe("hello there\n\nnext");
  });

  it("turns control characters into spaces", () => {
    expect(cleanText("a\u0000b\tc")).toBe("a b c");
  });
});

describe("validateSubmission", () => {
  it("accepts a normal thought and an optional name", () => {
    expect(validateSubmission({ body: " What grows in shade? ", nameTag: " Sam " }, clean)).toEqual({
      ok: true,
      value: { body: "What grows in shade?", nameTag: "Sam" },
    });
  });

  it("stores a blank name as null", () => {
    const result = validateSubmission({ body: "Hi", nameTag: "   " }, clean);
    expect(result.ok && result.value.nameTag).toBeNull();
  });

  it("rejects empty, too-long, and malformed input", () => {
    expect(validateSubmission({ body: "   \n " }, clean)).toMatchObject({ ok: false, reason: "empty" });
    expect(validateSubmission({ body: "x".repeat(BODY_MAX + 1) }, clean)).toMatchObject({
      ok: false,
      reason: "too-long",
    });
    expect(
      validateSubmission({ body: "ok", nameTag: "n".repeat(NAME_TAG_MAX + 1) }, clean),
    ).toMatchObject({ ok: false, reason: "too-long" });
    expect(validateSubmission(null, clean)).toMatchObject({ ok: false, reason: "bad-input" });
    expect(validateSubmission({ body: 42 }, clean)).toMatchObject({ ok: false, reason: "bad-input" });
    expect(validateSubmission({ body: "ok", nameTag: 7 }, clean)).toMatchObject({
      ok: false,
      reason: "bad-input",
    });
  });

  it("counts length after cleaning, so padding doesn't count", () => {
    expect(validateSubmission({ body: `  ${"x".repeat(BODY_MAX)}  ` }, clean).ok).toBe(true);
  });

  it("rejects profanity in the body or the name", () => {
    const flagged = (t: string) => t.includes("BAD");
    expect(validateSubmission({ body: "so BAD" }, flagged)).toMatchObject({ reason: "profanity" });
    expect(validateSubmission({ body: "fine", nameTag: "BAD" }, flagged)).toMatchObject({
      reason: "profanity",
    });
  });
});

describe("containsProfanity", () => {
  it("lets ordinary festival talk through, including words that hide a bad word", () => {
    expect(containsProfanity("How might we grow a kinder neighbourhood?")).toBe(false);
    expect(containsProfanity("I grew up near Scunthorpe and loved the class assignment.")).toBe(false);
  });

  it("catches obvious and disguised swearing", () => {
    expect(containsProfanity("this is shit")).toBe(true);
    expect(containsProfanity("this is sh1t")).toBe(true);
  });
});

describe("checkRateLimit", () => {
  const now = 10_000_000;
  const rule = [{ max: 3, windowMs: 60_000 }];

  it("allows submissions under the limit", () => {
    expect(checkRateLimit([], now, rule)).toEqual({ allowed: true });
    expect(checkRateLimit([now - 5_000, now - 1_000], now, rule)).toEqual({ allowed: true });
  });

  it("blocks the next one at the limit and says when to retry", () => {
    const times = [now - 50_000, now - 20_000, now - 1_000];
    expect(checkRateLimit(times, now, rule)).toEqual({ allowed: false, retryAfterSec: 10 });
  });

  it("ignores submissions older than the window", () => {
    const times = [now - 120_000, now - 90_000, now - 61_000, now - 1_000];
    expect(checkRateLimit(times, now, rule)).toEqual({ allowed: true });
  });

  it("uses the longest wait when several rules are broken", () => {
    const times = Array.from({ length: 12 }, (_, i) => now - 30 * 60_000 + i * 1_000);
    const decision = checkRateLimit(times, now, DEVICE_RULES);
    expect(decision).toEqual({ allowed: false, retryAfterSec: 30 * 60 });
  });

  it("stops 10 rapid submissions from one phone after the third", () => {
    const sent: number[] = [];
    let accepted = 0;
    for (let i = 0; i < 10; i++) {
      const t = now + i * 500;
      if (checkRateLimit(sent, t, DEVICE_RULES).allowed) {
        sent.push(t);
        accepted++;
      }
    }
    expect(accepted).toBe(3);
  });

  it("looks back as far as the longest rule", () => {
    expect(lookbackMs(DEVICE_RULES)).toBe(60 * 60_000);
    expect(lookbackMs(FLOOD_RULES)).toBe(60_000);
  });
});
