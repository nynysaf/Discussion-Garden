import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppStatePatch } from "@/lib/realtime/app-state";
import type { Tier, VineKind } from "./types";

// Host-only garden writes (RLS: "hosts manage nodes/vines"). Manual edits are
// published straight away; AI drafts come in Phase 6. Each throws on failure.

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function addVine(
  supabase: SupabaseClient,
  vine: { sourceId: string; targetId: string; kind: VineKind; sessionId: string | null },
) {
  const { error } = await supabase.from("garden_vines").insert({
    source_node_id: vine.sourceId,
    target_node_id: vine.targetId,
    kind: vine.kind,
    status: "published",
    origin: "manual",
    origin_session_id: vine.sessionId,
  });
  check(error);
}

/** Plant a node, optionally joined to the idea it grows into. */
export async function plantNode(
  supabase: SupabaseClient,
  node: { tier: Tier; label: string; growsIntoId: string | null; sessionId: string | null },
) {
  const { data, error } = await supabase
    .from("garden_nodes")
    .insert({
      tier: node.tier,
      label: node.label,
      status: "published",
      origin: "manual",
      origin_session_id: node.sessionId,
    })
    .select("id")
    .single();
  check(error);
  if (node.growsIntoId && data) {
    await addVine(supabase, {
      sourceId: data.id as string,
      targetId: node.growsIntoId,
      kind: "grows_into",
      sessionId: node.sessionId,
    });
  }
}

export async function updateNode(
  supabase: SupabaseClient,
  id: string,
  patch: { label?: string; tier?: Tier; weight?: number },
) {
  const { error } = await supabase.from("garden_nodes").update(patch).eq("id", id);
  check(error);
}

/** Its vines go too (on delete cascade). */
export async function deleteNode(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("garden_nodes").delete().eq("id", id);
  check(error);
}

export async function deleteVine(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("garden_vines").delete().eq("id", id);
  check(error);
}

/** All-or-nothing merge in the database (migration 20261001000004). */
export async function mergeNodes(supabase: SupabaseClient, keepId: string, dropId: string) {
  const { error } = await supabase.rpc("merge_garden_nodes", { keep_id: keepId, drop_id: dropId });
  check(error);
}

export async function setGardenHidden(supabase: SupabaseClient, hidden: boolean) {
  const { error } = await supabase
    .from("app_state")
    .update(toAppStatePatch({ gardenHidden: hidden }))
    .eq("id", true);
  check(error);
}
