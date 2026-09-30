import type { CaptionWord } from "./types";

/** Build fake words: "Hello there." spoken by speaker 0 starting at 0ms. */
export function words(
  sentence: string,
  speaker = 0,
  startMs = 0,
  isFinal = true,
): CaptionWord[] {
  return sentence
    .split(/\s+/)
    .filter(Boolean)
    .map((text, i) => ({
      text,
      startMs: startMs + i * 300,
      endMs: startMs + i * 300 + 250,
      speaker,
      isFinal,
    }));
}
