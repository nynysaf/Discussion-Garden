import type { GardenVine } from "./types";

/** Build undirected adjacency from vines. */
export function adjacencyFromVines(vines: GardenVine[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const v of vines) {
    add(v.sourceId, v.targetId);
    add(v.targetId, v.sourceId);
  }
  return adj;
}

/**
 * Nodes within `depth` hops of `root` (inclusive). depth 2 = self + neighbors + their neighbors.
 */
export function neighborhoodIds(
  adj: Map<string, Set<string>>,
  root: string,
  depth = 2,
): Set<string> {
  const seen = new Set<string>([root]);
  let frontier = [root];
  for (let d = 0; d < depth; d += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of adj.get(id) ?? []) {
        if (seen.has(n)) continue;
        seen.add(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return seen;
}

/** Vine is lit if both ends are in the focus set. */
export function vineInFocus(
  sourceId: string,
  targetId: string,
  focus: Set<string> | null,
): boolean {
  if (!focus) return true;
  return focus.has(sourceId) && focus.has(targetId);
}
