import { describe, expect, it } from "vitest";
import {
  formatDayTranscript,
  transcriptFilename,
  voiceLabel,
} from "./transcript-export";

describe("voiceLabel", () => {
  it("cycles garden animals and never uses names", () => {
    expect(voiceLabel(0)).toBe("Frog");
    expect(voiceLabel(12)).toBe("Frog");
  });
});

describe("formatDayTranscript", () => {
  it("writes a dated header and timed lines in animal order", () => {
    const text = formatDayTranscript(
      [
        {
          speaker: 1,
          text: "  Can you say more? ",
          startMs: 65_000,
          createdAt: "2026-10-17T15:01:00Z",
        },
        {
          speaker: 0,
          text: "That's what I noticed.",
          startMs: 60_000,
          createdAt: "2026-10-17T15:00:00Z",
        },
      ],
      {
        daySlug: "day_1",
        dayTitle: "Saturday",
        exportedAt: new Date("2026-10-17T17:00:00Z"),
      },
    );
    expect(text).toContain("Day: Saturday (day_1)");
    expect(text).toContain("[01:00] Frog: That's what I noticed.");
    expect(text).toContain("[01:05] Bird: Can you say more?");
    expect(text).not.toMatch(/\bSpeaker\b/);
    expect(text).not.toMatch(/\bHost\b/);
  });

  it("notes when the day has no lines yet", () => {
    expect(formatDayTranscript([], { daySlug: "day_2" })).toContain(
      "(No captions saved for this day yet.)",
    );
  });
});

describe("transcriptFilename", () => {
  it("includes the day slug", () => {
    expect(transcriptFilename("day_1", new Date("2026-10-17T12:00:00Z"))).toMatch(
      /^discussion-garden-day_1-/,
    );
  });
});
