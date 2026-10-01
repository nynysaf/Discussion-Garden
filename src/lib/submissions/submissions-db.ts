import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppStatePatch, type AppState } from "@/lib/realtime/app-state";

// Host-only writes (RLS: "hosts manage submissions", app_state host update). Each throws on failure.

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** Hiding also unpins the message (database trigger). */
export async function setSubmissionHidden(supabase: SupabaseClient, id: string, hidden: boolean) {
  const { error } = await supabase
    .from("audience_submissions")
    .update({ status: hidden ? "dismissed" : "approved" })
    .eq("id", id);
  check(error);
}

async function patchAppState(supabase: SupabaseClient, patch: Partial<AppState>) {
  const { error } = await supabase.from("app_state").update(toAppStatePatch(patch)).eq("id", true);
  check(error);
}

export function setHighlighted(supabase: SupabaseClient, id: string | null) {
  return patchAppState(supabase, { highlightedSubmissionId: id });
}

export function setSubmissionsOpen(supabase: SupabaseClient, open: boolean) {
  return patchAppState(supabase, { submissionsOpen: open });
}
