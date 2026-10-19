import type { ArchiveSegment } from "./types";

/** Consecutive lines from the same voice on the same day, joined into one turn. */
export type TranscriptTurn = {
  id: string;
  day: ArchiveSegment["day"];
  voice: string;
  clock: string;
  text: string;
  redacted?: boolean;
  movementId?: string;
  segmentIds: string[];
};

export function groupConsecutiveTurns(segments: ArchiveSegment[]): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  for (const seg of segments) {
    const prev = turns[turns.length - 1];
    if (prev && prev.voice === seg.voice && prev.day === seg.day) {
      prev.text = `${prev.text} ${seg.text}`.replace(/\s+/g, " ").trim();
      prev.segmentIds.push(seg.id);
      if (seg.redacted) prev.redacted = true;
      if (!prev.movementId && seg.movementId) prev.movementId = seg.movementId;
      continue;
    }
    turns.push({
      id: `turn-${seg.id}`,
      day: seg.day,
      voice: seg.voice,
      clock: seg.clock,
      text: seg.text,
      redacted: seg.redacted,
      movementId: seg.movementId,
      segmentIds: [seg.id],
    });
  }
  return turns;
}
