import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppStatePatch } from "@/lib/realtime/app-state";

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function addInquiry(
  supabase: SupabaseClient,
  body: string,
  sessionId: string | null,
  makeLive: boolean,
) {
  const { data, error } = await supabase
    .from("live_inquiries")
    .insert({ body, session_id: sessionId })
    .select("id")
    .single();
  check(error);
  if (makeLive && data?.id) {
    await makeInquiryLive(supabase, data.id, sessionId);
  }
}

export async function makeInquiryLive(
  supabase: SupabaseClient,
  inquiryId: string,
  sessionId: string | null,
) {
  const now = new Date().toISOString();
  const touched = await supabase
    .from("live_inquiries")
    .update({ last_activated_at: now })
    .eq("id", inquiryId);
  check(touched.error);
  const activation = await supabase.from("live_inquiry_activations").insert({
    inquiry_id: inquiryId,
    session_id: sessionId,
    activated_at: now,
  });
  check(activation.error);
  const state = await supabase
    .from("app_state")
    .update(toAppStatePatch({ activeLiveInquiryId: inquiryId }))
    .eq("id", true);
  check(state.error);
}

export async function clearLiveInquiry(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("app_state")
    .update(toAppStatePatch({ activeLiveInquiryId: null }))
    .eq("id", true);
  check(error);
}

export async function deleteInquiry(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("live_inquiries").delete().eq("id", id);
  check(error);
}

export async function fetchActivationsForSession(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from("live_inquiry_activations")
    .select("id, inquiry_id, session_id, activated_at, live_inquiries(body)")
    .eq("session_id", sessionId)
    .order("activated_at", { ascending: true });
  check(error);
  return (data ?? []).map((row) => {
    const nested = row.live_inquiries as { body?: string } | { body?: string }[] | null;
    const body = Array.isArray(nested) ? nested[0]?.body : nested?.body;
    return {
      id: row.id as string,
      inquiryId: row.inquiry_id as string,
      body: body ?? "(question removed)",
      sessionId: row.session_id as string | null,
      activatedAt: row.activated_at as string,
    };
  });
}
