import type { CaptionWord } from "@/lib/captions/types";

export type DeepgramEvent =
  | { kind: "results"; words: CaptionWord[]; isFinal: boolean }
  | { kind: "utterance-end" }
  | { kind: "ignored" };

type RawWord = {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
  speaker?: number;
};

type RawMessage = {
  type?: string;
  is_final?: boolean;
  channel?: { alternatives?: { words?: RawWord[] }[] };
};

function toCaptionWord(raw: RawWord, isFinal: boolean): CaptionWord | null {
  const text = (raw.punctuated_word ?? raw.word ?? "").trim();
  if (!text) return null;
  return {
    text,
    startMs: Math.round((raw.start ?? 0) * 1000),
    endMs: Math.round((raw.end ?? 0) * 1000),
    speaker: typeof raw.speaker === "number" ? raw.speaker : 0,
    isFinal,
  };
}

/** Normalize one Deepgram WebSocket message. Never throws. */
export function parseDeepgramMessage(data: string): DeepgramEvent {
  let message: RawMessage;
  try {
    message = JSON.parse(data) as RawMessage;
  } catch {
    return { kind: "ignored" };
  }

  if (message.type === "UtteranceEnd") return { kind: "utterance-end" };
  if (message.type !== "Results") return { kind: "ignored" };

  const isFinal = message.is_final === true;
  const rawWords = message.channel?.alternatives?.[0]?.words ?? [];
  const words = rawWords
    .map((w) => toCaptionWord(w, isFinal))
    .filter((w): w is CaptionWord => w !== null);

  return { kind: "results", words, isFinal };
}
