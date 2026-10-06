const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "is", "it",
  "its", "of", "on", "or", "our", "that", "the", "their", "to", "we", "with",
]);

/** Very light stemming so "currencies keep" matches "currency keeps". */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function labelTokens(label: string): Set<string> {
  return new Set(
    normalizeLabel(label)
      .split(" ")
      .filter((w) => w && !STOP_WORDS.has(w))
      .map(stem),
  );
}

/** Same idea in different words? Exact match, or most of the meaningful words shared. */
export function similarLabels(a: string, b: string, threshold = 0.6): boolean {
  if (normalizeLabel(a) === normalizeLabel(b)) return true;
  const ta = labelTokens(a);
  const tb = labelTokens(b);
  if (ta.size < 2 || tb.size < 2) return false;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared) >= threshold;
}
