import type { SupabaseClient } from "@supabase/supabase-js";
import type { Garden, GardenNode, GardenVine, Tier, VineKind } from "./types";

/** Tables whose changes mean "re-read the garden" (app_state also signals unpublishes). */
export const GARDEN_TABLES = ["garden_nodes", "garden_vines", "app_state"];

type NodeRow = {
  id: string;
  tier: string;
  label: string;
  weight: number;
  origin_session_id: string | null;
  created_at: string;
  updated_at: string;
};

type VineRow = { id: string; source_node_id: string; target_node_id: string; kind: string };

export function toGardenNode(row: NodeRow): GardenNode {
  return {
    id: row.id,
    tier: row.tier as Tier,
    label: row.label,
    weight: row.weight,
    originSessionId: row.origin_session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toGardenVine(row: VineRow): GardenVine {
  return {
    id: row.id,
    sourceId: row.source_node_id,
    targetId: row.target_node_id,
    kind: row.kind as VineKind,
  };
}

/** The whole festival garden — never filtered by day. Vines whose ends aren't both present are dropped. */
export async function fetchPublishedGarden(supabase: SupabaseClient): Promise<Garden> {
  const [nodes, vines] = await Promise.all([
    supabase
      .from("garden_nodes")
      .select("id, tier, label, weight, origin_session_id, created_at, updated_at")
      .eq("status", "published")
      .order("created_at")
      .limit(1000),
    supabase
      .from("garden_vines")
      .select("id, source_node_id, target_node_id, kind")
      .eq("status", "published")
      .limit(3000),
  ]);
  const error = nodes.error ?? vines.error;
  if (error) throw new Error(error.message);
  const gardenNodes = ((nodes.data ?? []) as NodeRow[]).map(toGardenNode);
  const ids = new Set(gardenNodes.map((n) => n.id));
  const gardenVines = ((vines.data ?? []) as VineRow[])
    .map(toGardenVine)
    .filter((v) => ids.has(v.sourceId) && ids.has(v.targetId));
  return { nodes: gardenNodes, vines: gardenVines };
}
