import type { WindowSegment } from "./types";

export const WINDOW_MAX_CHARS = 6_000;
/** Less than this much new talk isn't worth a call ("skip windows with little substance"). */
export const WINDOW_MIN_CHARS = 200;
/** Never look further back than this, so a failing window can't grow forever. */
export const WINDOW_MAX_AGE_MS = 10 * 60_000;

export type TranscriptWindow = {
  /** Oldest first. */
  segments: WindowSegment[];
  /** Short ref the model cites ("s1") → transcript segment id. */
  refs: Map<string, string>;
  /** One "[s1] text" line per segment. */
  text: string;
  start: string | null;
  end: string | null;
  substantial: boolean;
};

/** The newest segments that fit in `maxChars`, labelled s1, s2, … in spoken order. */
export function buildWindow(
  segments: WindowSegment[],
  { maxChars = WINDOW_MAX_CHARS, minChars = WINDOW_MIN_CHARS } = {},
): TranscriptWindow {
  const sorted = segments
    .filter((s) => s.text.trim().length > 0)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const kept: WindowSegment[] = [];
  let chars = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const length = sorted[i].text.trim().length;
    if (kept.length > 0 && chars + length > maxChars) break;
    kept.unshift(sorted[i]);
    chars += length;
  }

  const refs = new Map<string, string>();
  const lines = kept.map((s, i) => {
    const ref = `s${i + 1}`;
    refs.set(ref, s.id);
    return `[${ref}] ${s.text.trim().replace(/\s+/g, " ")}`;
  });

  return {
    segments: kept,
    refs,
    text: lines.join("\n"),
    start: kept[0]?.createdAt ?? null,
    end: kept.at(-1)?.createdAt ?? null,
    substantial: chars >= minChars,
  };
}
