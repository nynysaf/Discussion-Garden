import type { GardenNode, Tier, VineKind } from "@/lib/garden/types";
import type { SynthesisMode } from "@/lib/realtime/app-state";
import type { SynthesisResult } from "./types";

export type DraftNode = {
  id: string;
  tier: Tier;
  label: string;
  rationale: string | null;
  segmentIds: string[];
  createdAt: string;
};
export type DraftVine = { id: string; sourceId: string; targetId: string; kind: VineKind };
export type DraftReinforcement = {
  id: string;
  nodeId: string;
  rationale: string | null;
  segmentIds: string[];
  createdAt: string;
};
export type LastRun = { createdAt: string; mode: SynthesisMode; error: string | null };

/** Everything the host's draft queue reads (host-only rows; RLS hides them from the public). */
export type DraftData = {
  nodes: DraftNode[];
  vines: DraftVine[];
  reinforcements: DraftReinforcement[];
  published: Pick<GardenNode, "id" | "tier" | "label">[];
  /** Transcript segment id → sentence, for "from the talk" quotes. */
  quotes: Record<string, string>;
  lastRun: LastRun | null;
};

export const EMPTY_DRAFTS: DraftData = {
  nodes: [],
  vines: [],
  reinforcements: [],
  published: [],
  quotes: {},
  lastRun: null,
};

export type DraftLink = { label: string; kind: VineKind; outgoing: boolean; waiting: boolean };

export type QueueItem =
  | { type: "node"; id: string; node: DraftNode; links: DraftLink[]; quotes: string[] }
  | { type: "vine"; id: string; vine: DraftVine; sourceLabel: string; targetLabel: string }
  | {
      type: "reinforce";
      /** The first suggestion's id (stable React key); `ids` holds every suggestion for this idea. */
      id: string;
      ids: string[];
      label: string;
      rationale: string | null;
      quotes: string[];
    };

export type ApproveStep = { type: QueueItem["type"]; id: string };

const TIER_ORDER: Record<Tier, number> = { theme: 0, sprout: 1, seed: 2 };

function quotesFor(ids: string[], quotes: Record<string, string>): string[] {
  return ids.map((id) => quotes[id]).filter((q): q is string => Boolean(q));
}

/**
 * The review queue: new ideas (themes first, each with the vines that join it
 * to the garden), new vines between two ideas already in the garden, then
 * "mentioned again". Vines touching a rejected or missing idea are left out.
 */
export function buildQueue(data: DraftData): QueueItem[] {
  const draftById = new Map(data.nodes.map((n) => [n.id, n]));
  const publishedById = new Map(data.published.map((n) => [n.id, n]));
  const labelOf = (id: string) => draftById.get(id)?.label ?? publishedById.get(id)?.label;

  const nodes: QueueItem[] = [...data.nodes]
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.createdAt.localeCompare(b.createdAt))
    .map((node) => {
      const links: DraftLink[] = [];
      for (const vine of data.vines) {
        const outgoing = vine.sourceId === node.id;
        if (!outgoing && vine.targetId !== node.id) continue;
        const otherId = outgoing ? vine.targetId : vine.sourceId;
        const label = labelOf(otherId);
        if (label) links.push({ label, kind: vine.kind, outgoing, waiting: draftById.has(otherId) });
      }
      return { type: "node", id: node.id, node, links, quotes: quotesFor(node.segmentIds, data.quotes) };
    });

  const vines: QueueItem[] = data.vines
    .filter((v) => publishedById.has(v.sourceId) && publishedById.has(v.targetId))
    .map((vine) => ({
      type: "vine",
      id: vine.id,
      vine,
      sourceLabel: publishedById.get(vine.sourceId)!.label,
      targetLabel: publishedById.get(vine.targetId)!.label,
    }));

  // Several runs can say the same idea came up again: one card, one size per mention.
  const byNode = new Map<string, DraftReinforcement[]>();
  for (const r of data.reinforcements) {
    if (publishedById.has(r.nodeId)) byNode.set(r.nodeId, [...(byNode.get(r.nodeId) ?? []), r]);
  }
  const reinforce: QueueItem[] = [...byNode].map(([nodeId, group]) => ({
    type: "reinforce",
    id: group[0].id,
    ids: group.map((r) => r.id),
    label: publishedById.get(nodeId)!.label,
    rationale: group.find((r) => r.rationale)?.rationale ?? null,
    quotes: [...new Set(quotesFor(group.flatMap((r) => r.segmentIds), data.quotes))],
  }));

  return [...nodes, ...vines, ...reinforce];
}

/**
 * "Approve all" order. Ideas first: approving an idea publishes its vines once
 * the other end is published too, so vines between two new ideas go live with
 * the second one. Then standalone vines, then every "mentioned again".
 */
export function approveAllSteps(queue: QueueItem[]): ApproveStep[] {
  const rank = { node: 0, vine: 1, reinforce: 2 } as const;
  return [...queue]
    .sort((a, b) => rank[a.type] - rank[b.type])
    .flatMap((item): ApproveStep[] =>
      item.type === "reinforce"
        ? item.ids.map((id) => ({ type: item.type, id }))
        : [{ type: item.type, id: item.id }],
    );
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** One friendly line for the host after "Suggest now". */
export function describeResult(result: SynthesisResult): string {
  if (result.status === "skipped") {
    return result.reason === "manual"
      ? "The garden AI is off (Manual). Switch to Hybrid or Auto first."
      : "Not enough new talk yet — try again after a bit more discussion.";
  }
  const { nodes, vines, reinforce } = result.added;
  const parts = [
    nodes > 0 && plural(nodes, "new idea"),
    vines > 0 && plural(vines, "vine"),
    reinforce > 0 && plural(reinforce, "“mentioned again”", "“mentioned again”"),
  ].filter(Boolean);
  if (parts.length === 0) return "Nothing new worth adding from that stretch of talk.";
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return result.mode === "auto"
    ? `Added ${list} straight to the garden.`
    : `${list} waiting for your review below.`.replace(/^./, (c) => c.toUpperCase());
}
