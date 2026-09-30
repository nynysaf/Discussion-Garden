/** One recognized word, normalized from a Deepgram result. */
export type CaptionWord = {
  /** Punctuated form when available ("Hello," rather than "hello"). */
  text: string;
  startMs: number;
  endMs: number;
  /** Deepgram speaker number within the current connection (0, 1, 2…). */
  speaker: number;
  /** False while Deepgram may still revise the word (interim result). */
  isFinal: boolean;
};

/** One sentence from one speaker — rendered as a single speech bubble. */
export type CaptionBubble = {
  id: string;
  /** Speaker numbers are only meaningful within one Deepgram connection. */
  connectionId: string;
  speaker: number;
  finalText: string;
  /** Words Deepgram may still revise; shown lighter on screen. */
  interimText: string;
  startMs: number;
  endMs: number;
  /** True once the sentence is finished and will not change again. */
  isComplete: boolean;
};

export type AudioStatus =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "paused"
  | "error";
