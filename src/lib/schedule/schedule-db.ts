import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppStatePatch } from "@/lib/realtime/app-state";
import type { SortUpdate } from "./schedule";

// Host-only writes (RLS: "hosts manage schedule"). Each throws on failure so the UI can show it.

type ItemFields = { title: string; question: string | null; startsAt: string | null };

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function addScheduleItem(
  supabase: SupabaseClient,
  item: ItemFields & { sessionId: string; sortOrder: number },
) {
  const { error } = await supabase.from("schedule_items").insert({
    session_id: item.sessionId,
    title: item.title,
    question: item.question,
    starts_at: item.startsAt,
    sort_order: item.sortOrder,
  });
  check(error);
}

export async function updateScheduleItem(supabase: SupabaseClient, id: string, item: ItemFields) {
  const { error } = await supabase
    .from("schedule_items")
    .update({ title: item.title, question: item.question, starts_at: item.startsAt })
    .eq("id", id);
  check(error);
}

/** Deleting the live item also clears it from the TVs (foreign key is `on delete set null`). */
export async function deleteScheduleItem(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("schedule_items").delete().eq("id", id);
  check(error);
}

export async function applySortUpdates(supabase: SupabaseClient, updates: SortUpdate[]) {
  const results = await Promise.all(
    updates.map((u) => supabase.from("schedule_items").update({ sort_order: u.sortOrder }).eq("id", u.id)),
  );
  check(results.find((r) => r.error)?.error ?? null);
}

export async function setLiveItem(supabase: SupabaseClient, id: string | null) {
  const { error } = await supabase
    .from("app_state")
    .update(toAppStatePatch({ activeScheduleItemId: id }))
    .eq("id", true);
  check(error);
}
