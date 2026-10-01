import type { GardenNode } from "./types";

/** ≤ 6 words and ≤ 32 characters, with an ellipsis when cut (DESIGN_GUIDE §6.2). */
export function shortLabel(label: string, maxWords = 6, maxChars = 32): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  let text = words.slice(0, maxWords).join(" ");
  let cut = words.length > maxWords;
  if (text.length > maxChars) {
    text = text.slice(0, maxChars).replace(/\s+\S*$/, "") || text.slice(0, maxChars);
    cut = true;
  }
  return cut ? `${text.replace(/[\s.,;:!?-]+$/, "")}…` : text;
}

/** The short label split into at most two balanced lines, so labels stay narrow. */
export function wrapLabel(label: string, maxLineChars = 18): string[] {
  const text = shortLabel(label);
  const words = text.split(" ");
  if (text.length <= maxLineChars || words.length < 2) return [text];
  let best = [text];
  let longest = Infinity;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const length = Math.max(lines[0].length, lines[1].length);
    if (length < longest) {
      longest = length;
      best = lines;
    }
  }
  return best;
}

/**
 * Which nodes get a label on the TV. Themes and sprouts always do. Seeds do
 * too until the garden gets crowded; then only the most recently added or
 * reinforced seeds keep theirs.
 */
export function labelledNodeIds(
  nodes: GardenNode[],
  { crowdedAt = 60, recentSeeds = 12 }: { crowdedAt?: number; recentSeeds?: number } = {},
): Set<string> {
  const ids = new Set(nodes.filter((n) => n.tier !== "seed").map((n) => n.id));
  const seeds = nodes.filter((n) => n.tier === "seed");
  const keep =
    nodes.length < crowdedAt
      ? seeds
      : [...seeds].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, recentSeeds);
  for (const seed of keep) ids.add(seed.id);
  return ids;
}
