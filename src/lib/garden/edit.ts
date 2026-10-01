import type { Garden, GardenNode, GardenVine, Tier, VineKind } from "./types";

/** Database limit on a node label. The TV shows at most 6 words of it. */
export const LABEL_MAX = 80;

export const TIER_NAME: Record<Tier, string> = { seed: "Seed", sprout: "Sprout", theme: "Theme" };

/** The tier a node naturally grows into (seed → sprout → theme). */
export function parentTier(tier: Tier): Tier | null {
  return tier === "seed" ? "sprout" : tier === "sprout" ? "theme" : null;
}

/** Trim, collapse spaces; null if empty or too long. */
export function cleanLabel(input: string): string | null {
  const label = input.trim().replace(/\s+/g, " ");
  return label.length > 0 && label.length <= LABEL_MAX ? label : null;
}

/** "Grows into" when the target is the next tier up; otherwise the ideas just relate. */
export function defaultVineKind(source: Tier, target: Tier): VineKind {
  return parentTier(source) === target ? "grows_into" : "relates_to";
}

/** True if the two nodes are already joined by a vine (either direction). */
export function vineExists(vines: GardenVine[], a: string, b: string): boolean {
  return vines.some(
    (v) => (v.sourceId === a && v.targetId === b) || (v.sourceId === b && v.targetId === a),
  );
}

export type Connection = { vine: GardenVine; other: GardenNode; outgoing: boolean };

/** Every vine touching a node, with the node at the other end. */
export function connectionsOf(garden: Garden, id: string): Connection[] {
  const byId = new Map(garden.nodes.map((n) => [n.id, n]));
  const out: Connection[] = [];
  for (const vine of garden.vines) {
    const outgoing = vine.sourceId === id;
    if (!outgoing && vine.targetId !== id) continue;
    const other = byId.get(outgoing ? vine.targetId : vine.sourceId);
    if (other) out.push({ vine, other, outgoing });
  }
  return out;
}

/** Case-insensitive label search, keeping garden order. */
export function searchNodes(nodes: GardenNode[], query: string): GardenNode[] {
  const q = query.trim().toLowerCase();
  return q ? nodes.filter((n) => n.label.toLowerCase().includes(q)) : nodes;
}

/** Nodes of one tier, A → Z, for pickers and the list. */
export function byTier(nodes: GardenNode[], tier: Tier): GardenNode[] {
  return nodes
    .filter((n) => n.tier === tier)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}
