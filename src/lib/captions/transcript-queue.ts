import type { CaptionBubble } from "./types";

export type TranscriptRow = {
  bubble_id: string;
  session_id: string | null;
  connection_id: string;
  speaker: number;
  text: string;
  start_ms: number;
  end_ms: number;
};

export function toTranscriptRow(
  bubble: CaptionBubble,
  sessionId: string | null,
): TranscriptRow | null {
  const text = bubble.finalText.trim();
  if (!text) return null;
  return {
    bubble_id: bubble.id,
    session_id: sessionId,
    connection_id: bubble.connectionId,
    speaker: bubble.speaker,
    text,
    start_ms: Math.round(bubble.startMs),
    end_ms: Math.round(bubble.endMs),
  };
}

export const MAX_PENDING_ROWS = 5000;

/**
 * Saves finished bubbles in batches, off the caption path. Failed saves stay
 * queued and are retried on the next flush; rows are idempotent (bubble_id).
 */
export class TranscriptQueue {
  private pending: TranscriptRow[] = [];
  private saving = false;

  constructor(
    private readonly save: (rows: TranscriptRow[]) => Promise<void>,
    private readonly maxPending: number = MAX_PENDING_ROWS,
  ) {}

  get size(): number {
    return this.pending.length;
  }

  enqueue(bubbles: CaptionBubble[], sessionId: string | null): void {
    for (const bubble of bubbles) {
      const row = toTranscriptRow(bubble, sessionId);
      if (row) this.pending.push(row);
    }
    if (this.pending.length > this.maxPending) {
      this.pending = this.pending.slice(-this.maxPending);
    }
  }

  /** Returns true when everything queued so far has been saved. */
  async flush(): Promise<boolean> {
    if (this.saving) return false;
    if (this.pending.length === 0) return true;
    this.saving = true;
    const batch = this.pending.slice(0, 200);
    try {
      await this.save(batch);
      this.pending = this.pending.slice(batch.length);
      return this.pending.length === 0;
    } catch {
      return false;
    } finally {
      this.saving = false;
    }
  }
}
