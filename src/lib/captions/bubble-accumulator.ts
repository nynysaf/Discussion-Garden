import { endsSentence, groupWords, joinWords } from "./group-words";
import type { CaptionBubble, CaptionWord } from "./types";

export type BubbleUpdate = {
  /** Bubbles that just finished — each is reported exactly once. */
  completed: CaptionBubble[];
  /** Bubbles still being spoken (may change on the next update). */
  live: CaptionBubble[];
};

export function toBubble(
  connectionId: string,
  words: CaptionWord[],
  isComplete: boolean,
): CaptionBubble {
  const first = words[0];
  const last = words[words.length - 1];
  return {
    id: `${connectionId}:${Math.round(first.startMs)}`,
    connectionId,
    speaker: first.speaker,
    finalText: joinWords(words.filter((w) => w.isFinal)),
    interimText: joinWords(words.filter((w) => !w.isFinal)),
    startMs: first.startMs,
    endMs: last.endMs,
    isComplete,
  };
}

/**
 * Turns one Deepgram connection's stream of interim/final results into
 * speech bubbles. Only the unfinished tail is kept in memory, so it is safe
 * to run for hours.
 */
export class BubbleAccumulator {
  private openFinal: CaptionWord[] = [];
  private interim: CaptionWord[] = [];

  constructor(readonly connectionId: string) {}

  /**
   * Deepgram sends interim results that replace each other, then one final
   * result that locks those words in.
   */
  ingest(words: CaptionWord[], isFinal: boolean): BubbleUpdate {
    if (isFinal) {
      this.openFinal.push(...words.map((w) => ({ ...w, isFinal: true })));
      this.interim = [];
    } else {
      this.interim = words.map((w) => ({ ...w, isFinal: false }));
    }
    return { completed: this.takeCompleted(false), live: this.live() };
  }

  /**
   * Close the open bubble even without end punctuation — used when
   * Deepgram reports a pause (UtteranceEnd). Interim words are kept waiting.
   */
  flushPause(): BubbleUpdate {
    if (this.interim.length > 0) {
      return { completed: [], live: this.live() };
    }
    return { completed: this.takeCompleted(true), live: this.live() };
  }

  /** Finish everything, including unconfirmed words — used on stop/pause. */
  flushAll(): BubbleUpdate {
    this.openFinal.push(...this.interim.map((w) => ({ ...w, isFinal: true })));
    this.interim = [];
    return { completed: this.takeCompleted(true), live: [] };
  }

  live(): CaptionBubble[] {
    const words = [...this.openFinal, ...this.interim];
    return groupWords(words).map((g) => toBubble(this.connectionId, g, false));
  }

  private takeCompleted(closeTail: boolean): CaptionBubble[] {
    const groups = groupWords(this.openFinal);
    if (groups.length === 0) return [];

    const tail = groups[groups.length - 1];
    const tailDone =
      closeTail || endsSentence(tail[tail.length - 1].text);

    const done = tailDone ? groups : groups.slice(0, -1);
    this.openFinal = tailDone ? [] : tail;

    return done.map((g) => toBubble(this.connectionId, g, true));
  }
}
