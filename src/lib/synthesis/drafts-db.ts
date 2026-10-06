import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tier } from "@/lib/garden/types";
import { toAppStatePatch, type SynthesisMode } from "@/lib/realtime/app-state";
import type { ApproveStep, DraftData, DraftNode, DraftReinforcement, DraftVine, LastRun } from "./drafts";
import type { SynthesisResult } from "./types";

/** Tables whose changes mean "re-read the draft queue". */
export const DRAFT_TABLES = ["garden_nodes", "garden_vines", "garden_reinforcements", "synthesis_runs"];

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** Host-only read of everything waiting for review, plus the sentences it cites. */
export async function fetchDrafts(supabase: SupabaseClient): Promise<DraftData> {
  const [nodes, vines, reinforcements, published, run] = await Promise.all([
    supabase
      .from("garden_nodes")
      .select("id, tier, label, description, source_segment_ids, created_at")
      .eq("status", "draft")
      .order("created_at")
      .limit(200),
    supabase
      .from("garden_vines")
      .select("id, source_node_id, target_node_id, kind")
      .eq("status", "draft")
      .limit(500),
    supabase
      .from("garden_reinforcements")
      .select("id, node_id, rationale, source_segment_ids, created_at")
      .eq("status", "draft")
      .order("created_at")
      .limit(200),
    supabase.from("garden_nodes").select("id, tier, label").eq("status", "published").limit(1000),
    supabase
      .from("synthesis_runs")
      .select("created_at, mode, error")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  check(nodes.error ?? vines.error ?? reinforcements.error ?? published.error ?? run.error);

  const draftNodes: DraftNode[] = (nodes.data ?? []).map((r) => ({
    id: r.id,
    tier: r.tier as Tier,
    label: r.label,
    rationale: r.description,
    segmentIds: r.source_segment_ids ?? [],
    createdAt: r.created_at,
  }));
  const draftReinforcements: DraftReinforcement[] = (reinforcements.data ?? []).map((r) => ({
    id: r.id,
    nodeId: r.node_id,
    rationale: r.rationale,
    segmentIds: r.source_segment_ids ?? [],
    createdAt: r.created_at,
  }));

  const segmentIds = [
    ...new Set([...draftNodes, ...draftReinforcements].flatMap((d) => d.segmentIds)),
  ].slice(0, 300);
  const quotes: Record<string, string> = {};
  if (segmentIds.length > 0) {
    const { data, error } = await supabase
      .from("transcript_segments")
      .select("id, text")
      .in("id", segmentIds);
    check(error);
    for (const row of data ?? []) quotes[row.id] = row.text;
  }

  return {
    nodes: draftNodes,
    vines: (vines.data ?? []).map(
      (r): DraftVine => ({
        id: r.id,
        sourceId: r.source_node_id,
        targetId: r.target_node_id,
        kind: r.kind,
      }),
    ),
    reinforcements: draftReinforcements,
    published: (published.data ?? []).map((r) => ({ id: r.id, tier: r.tier as Tier, label: r.label })),
    quotes,
    lastRun: run.data
      ? ({ createdAt: run.data.created_at, mode: run.data.mode, error: run.data.error } as LastRun)
      : null,
  };
}

export async function setSynthesisMode(supabase: SupabaseClient, mode: SynthesisMode) {
  const { error } = await supabase
    .from("app_state")
    .update(toAppStatePatch({ synthesisMode: mode }))
    .eq("id", true);
  check(error);
}

/** Approve a draft idea, optionally renamed / moved to another tier first. */
export async function approveNode(
  supabase: SupabaseClient,
  id: string,
  edit: { label?: string; tier?: Tier } = {},
) {
  const { error } = await supabase.rpc("approve_garden_node", {
    node_id: id,
    new_label: edit.label ?? null,
    new_tier: edit.tier ?? null,
  });
  check(error);
}

export async function rejectNode(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.rpc("reject_garden_node", { node_id: id });
  check(error);
}

export async function setVineStatus(
  supabase: SupabaseClient,
  id: string,
  status: "published" | "rejected",
) {
  const { error } = await supabase
    .from("garden_vines")
    .update({ status })
    .eq("id", id)
    .eq("status", "draft");
  check(error);
}

export async function approveReinforcement(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.rpc("approve_garden_reinforcement", { reinforcement_id: id });
  check(error);
}

export async function rejectReinforcement(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("garden_reinforcements")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "draft");
  check(error);
}

/**
 * Approve each step in order. Keeps going past items another host already
 * handled; throws a summary if anything failed.
 */
export async function approveAll(supabase: SupabaseClient, steps: ApproveStep[]) {
  let failed = 0;
  let lastError = "";
  for (const step of steps) {
    try {
      if (step.type === "node") await approveNode(supabase, step.id);
      else if (step.type === "vine") await setVineStatus(supabase, step.id, "published");
      else await approveReinforcement(supabase, step.id);
    } catch (e) {
      failed++;
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  if (failed > 0) {
    throw new Error(
      `Approved ${steps.length - failed} of ${steps.length}. ${failed} couldn't be approved (${lastError}).`,
    );
  }
}

/** Ask the server for one round of AI suggestions. Throws with a message safe to show the host. */
export async function requestSuggestions(): Promise<SynthesisResult> {
  let response: Response;
  try {
    response = await fetch("/api/synthesis", { method: "POST", cache: "no-store" });
  } catch {
    throw new Error("Couldn't reach the server — check the connection.");
  }
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (!response.ok || !body || body.error !== undefined) {
    throw new Error(typeof body?.error === "string" ? body.error : "The garden AI couldn't run.");
  }
  return body as SynthesisResult;
}
