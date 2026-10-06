import type { Tier, VineKind } from "@/lib/garden/types";

export type WindowSegment = { id: string; text: string; createdAt: string };

/** The model's reply. OpenAI Structured Outputs enforces this shape, but we still re-check every value. */
export type RawProposal = {
  new_nodes: { key: string; tier: Tier; label: string; rationale: string; segment_refs: string[] }[];
  reinforce: { ref: string; rationale: string; segment_refs: string[] }[];
  new_vines: { source: string; target: string; kind: VineKind; rationale: string }[];
};

/** A vine end: one of this run's new ideas, or an idea already in the garden. */
export type NodeRef = { kind: "new"; key: string } | { kind: "existing"; id: string };

export type PlannedNode = {
  key: string;
  tier: Tier;
  label: string;
  rationale: string;
  segmentIds: string[];
};
export type PlannedVine = { source: NodeRef; target: NodeRef; kind: VineKind };
export type PlannedReinforce = { nodeId: string; rationale: string; segmentIds: string[] };
export type Dropped = { item: string; reason: string };

/** What survives validation — safe to write to the database. */
export type SynthesisPlan = {
  nodes: PlannedNode[];
  vines: PlannedVine[];
  reinforce: PlannedReinforce[];
  dropped: Dropped[];
};
