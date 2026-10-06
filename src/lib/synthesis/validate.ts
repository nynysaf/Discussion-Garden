import { cleanLabel, parentTier, vineExists } from "@/lib/garden/edit";
import { TIERS, type GardenNode, type GardenVine, type Tier, type VineKind } from "@/lib/garden/types";
import { similarLabels } from "./similarity";
import type {
  Dropped,
  NodeRef,
  PlannedNode,
  PlannedReinforce,
  PlannedVine,
  SynthesisPlan,
} from "./types";

export const MAX_NEW_NODES = 5;
export const MAX_NEW_VINES = 8;
export const MAX_REINFORCE = 5;
export const LABEL_MAX_WORDS = 6;

export type ValidationContext = {
  /** Transcript refs ("s1") → segment id. */
  segmentRefs: Map<string, string>;
  /** Garden refs ("e1") → node id. */
  nodeRefs: Map<string, string>;
  /** Every published node, including ones not sent to the model. */
  published: GardenNode[];
  publishedVines: GardenVine[];
  /** Drafts still waiting and ideas a host rejected — never suggest these again. */
  blocked: { label: string; status: "draft" | "rejected" }[];
};

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((v) => v && typeof v === "object") : [];
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tidyLabel(raw: string): string | null {
  return cleanLabel(raw.replace(/^["'“”‘’]+|["'“”‘’.!]+$/g, ""));
}

/**
 * Turn the model's reply into a plan we're willing to write. Anything
 * ungrounded, too long, duplicated or unresolvable is dropped (with a reason
 * for the run log). A near-duplicate of a published idea becomes "mentioned again".
 */
export function planFromProposal(raw: unknown, ctx: ValidationContext): SynthesisPlan {
  const proposal = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const dropped: Dropped[] = [];
  const nodes: PlannedNode[] = [];
  const reinforce = new Map<string, PlannedReinforce>();
  const keyTo = new Map<string, NodeRef>();
  const byId = new Map(ctx.published.map((n) => [n.id, n]));

  const segmentIds = (refs: unknown) =>
    [...new Set(
      (Array.isArray(refs) ? refs : [])
        .map((r) => ctx.segmentRefs.get(str(r)))
        .filter((id): id is string => Boolean(id)),
    )];

  function addReinforce(nodeId: string, rationale: string, ids: string[], item: string) {
    const existing = reinforce.get(nodeId);
    if (existing) {
      existing.segmentIds = [...new Set([...existing.segmentIds, ...ids])];
    } else if (reinforce.size >= MAX_REINFORCE) {
      dropped.push({ item, reason: "too many “mentioned again” this round" });
    } else {
      reinforce.set(nodeId, { nodeId, rationale, segmentIds: ids });
    }
  }

  for (const item of list(proposal.new_nodes)) {
    const key = str(item.key);
    const label = tidyLabel(str(item.label));
    const tier = str(item.tier) as Tier;
    const rationale = str(item.rationale);
    const ids = segmentIds(item.segment_refs);
    const name = label ?? (str(item.label) || "(no label)");

    if (!key || keyTo.has(key)) {
      dropped.push({ item: name, reason: "missing or repeated key" });
      continue;
    }
    if (!label) {
      dropped.push({ item: name, reason: "empty or too long" });
      continue;
    }
    if (label.split(" ").length > LABEL_MAX_WORDS) {
      dropped.push({ item: label, reason: `longer than ${LABEL_MAX_WORDS} words` });
      continue;
    }
    if (!TIERS.includes(tier)) {
      dropped.push({ item: label, reason: "unknown tier" });
      continue;
    }
    if (tier === "seed" && ids.length === 0) {
      dropped.push({ item: label, reason: "seed not grounded in the transcript" });
      continue;
    }

    const match = ctx.published.find((n) => similarLabels(n.label, label));
    if (match) {
      keyTo.set(key, { kind: "existing", id: match.id });
      addReinforce(match.id, rationale, ids, label);
      continue;
    }
    const blocked = ctx.blocked.find((b) => similarLabels(b.label, label));
    if (blocked) {
      dropped.push({
        item: label,
        reason: blocked.status === "draft" ? "already waiting for review" : "a host rejected this before",
      });
      continue;
    }
    const twin = nodes.find((n) => similarLabels(n.label, label));
    if (twin) {
      keyTo.set(key, { kind: "new", key: twin.key });
      dropped.push({ item: label, reason: `duplicate of “${twin.label}”` });
      continue;
    }
    if (nodes.length >= MAX_NEW_NODES) {
      dropped.push({ item: label, reason: "too many new ideas this round" });
      continue;
    }
    nodes.push({ key, tier, label, rationale, segmentIds: ids });
    keyTo.set(key, { kind: "new", key });
  }

  for (const item of list(proposal.reinforce)) {
    const ref = str(item.ref);
    const nodeId = ctx.nodeRefs.get(ref);
    if (!nodeId || !byId.has(nodeId)) {
      dropped.push({ item: `reinforce ${ref || "?"}`, reason: "not an idea in the garden" });
      continue;
    }
    addReinforce(nodeId, str(item.rationale), segmentIds(item.segment_refs), byId.get(nodeId)!.label);
  }

  const resolve = (ref: string): NodeRef | null => {
    const fromKey = keyTo.get(ref);
    if (fromKey) return fromKey;
    const id = ctx.nodeRefs.get(ref);
    return id && byId.has(id) ? { kind: "existing", id } : null;
  };
  const identity = (r: NodeRef) => (r.kind === "new" ? `new:${r.key}` : `id:${r.id}`);
  const tierOf = (r: NodeRef) =>
    r.kind === "new" ? nodes.find((n) => n.key === r.key)!.tier : byId.get(r.id)!.tier;

  const vines: PlannedVine[] = [];
  const pairs = new Set<string>();
  for (const item of list(proposal.new_vines)) {
    const name = `${str(item.source) || "?"} → ${str(item.target) || "?"}`;
    let source = resolve(str(item.source));
    let target = resolve(str(item.target));
    if (!source || !target) {
      dropped.push({ item: name, reason: "an end isn't a known idea" });
      continue;
    }
    if (identity(source) === identity(target)) {
      dropped.push({ item: name, reason: "joins an idea to itself" });
      continue;
    }
    const pair = [identity(source), identity(target)].sort().join("|");
    if (pairs.has(pair)) {
      dropped.push({ item: name, reason: "duplicate vine" });
      continue;
    }
    if (
      source.kind === "existing" &&
      target.kind === "existing" &&
      vineExists(ctx.publishedVines, source.id, target.id)
    ) {
      dropped.push({ item: name, reason: "already connected" });
      continue;
    }
    if (vines.length >= MAX_NEW_VINES) {
      dropped.push({ item: name, reason: "too many vines this round" });
      continue;
    }

    let kind: VineKind = str(item.kind) === "grows_into" ? "grows_into" : "relates_to";
    if (kind === "grows_into" && parentTier(tierOf(source)) !== tierOf(target)) {
      if (parentTier(tierOf(target)) === tierOf(source)) {
        [source, target] = [target, source];
      } else {
        kind = "relates_to";
      }
    }
    pairs.add(pair);
    vines.push({ source, target, kind });
  }

  return { nodes, vines, reinforce: [...reinforce.values()], dropped };
}
