import { describe, expect, it } from "vitest";
import { chunksToWebm, webmFilename } from "./local-recording";

describe("webmFilename", () => {
  it("includes the day slug", () => {
    expect(webmFilename("day_1", new Date("2026-10-17T12:00:00Z"))).toMatch(
      /^discussion-garden-day_1-.*\.webm$/,
    );
  });
});

describe("chunksToWebm", () => {
  it("returns null when nothing was recorded", () => {
    expect(chunksToWebm([], "audio/webm")).toBeNull();
  });

  it("joins chunks into one blob", () => {
    const blob = chunksToWebm([new Blob(["a"]), new Blob(["b"])], "audio/webm;codecs=opus");
    expect(blob?.type).toContain("audio/webm");
    expect(blob?.size).toBeGreaterThan(0);
  });
});
