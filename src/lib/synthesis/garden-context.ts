import type { GardenNode, GardenVine, Tier } from "@/lib/garden/types";

export const CONTEXT_MAX_NODES = 150;

const TIER_ORDER: Record<Tier, number> = { theme: 0, sprout: 1, seed: 2 };

export type GardenContext = {
  /** One "[e1] theme: Label" line per idea sent to the model. */
  text: string;
  /** Short ref the model cites ("e1") → node id. */
  refs: Map<string, string>;
};

/**
 * The whole festival garden (never filtered by day) as a compact list. Past
 * `maxNodes`, every theme and sprout still goes in; seeds are the most
 * recently touched, then the heaviest.
 */
export function compactGarden(
  nodes: GardenNode[],
  vines: GardenVine[],
  maxNodes = CONTEXT_MAX_NODES,
): GardenContext {
  const upper = nodes.filter((n) => n.tier !== "seed");
  const seeds = nodes
    .filter((n) => n.tier === "seed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.weight - a.weight)
    .slice(0, Math.max(0, maxNodes - upper.length));

  const chosen = [...upper, ...seeds].sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.createdAt.localeCompare(b.createdAt),
  );

  const refs = new Map<string, string>();
  const refOf = new Map<string, string>();
  chosen.forEach((n, i) => {
    refs.set(`e${i + 1}`, n.id);
    refOf.set(n.id, `e${i + 1}`);
  });

  const lines = chosen.map((n) => {
    const growsInto = vines
      .filter((v) => v.kind === "grows_into" && v.sourceId === n.id && refOf.has(v.targetId))
      .map((v) => refOf.get(v.targetId));
    const weight = n.weight > 1 ? ` (mentioned ${n.weight}×)` : "";
    const parents = growsInto.length > 0 ? ` → grows into ${growsInto.join(", ")}` : "";
    return `[${refOf.get(n.id)}] ${n.tier}: ${n.label}${weight}${parents}`;
  });

  return { text: lines.join("\n"), refs };
}
