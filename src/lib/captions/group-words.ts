import type { CaptionWord } from "./types";

const SENTENCE_END = /[.?!…]["'”’)\]]*$/;

export function endsSentence(text: string): boolean {
  return SENTENCE_END.test(text.trim());
}

/**
 * Split a word stream into bubbles: a new group starts when the speaker
 * changes or the previous word ended a sentence.
 */
export function groupWords(words: CaptionWord[]): CaptionWord[][] {
  const groups: CaptionWord[][] = [];
  let current: CaptionWord[] = [];

  for (const word of words) {
    const previous = current[current.length - 1];
    const startNew =
      previous !== undefined &&
      (previous.speaker !== word.speaker || endsSentence(previous.text));

    if (startNew) {
      groups.push(current);
      current = [];
    }
    current.push(word);
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

export function joinWords(words: CaptionWord[]): string {
  return words
    .map((w) => w.text.trim())
    .filter(Boolean)
    .join(" ");
}
