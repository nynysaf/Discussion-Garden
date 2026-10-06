import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPublishedGarden } from "@/lib/garden/garden-db";
import type { SynthesisMode } from "@/lib/realtime/app-state";
import { compactGarden } from "./garden-context";
import { requestProposal, type ModelReply } from "./openai";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import type { NodeRef, SynthesisPlan, SynthesisResult, WindowSegment } from "./types";
import { planFromProposal } from "./validate";
import { buildWindow, WINDOW_MAX_AGE_MS } from "./window";

export type { SynthesisResult };

/** A failed run that has already been logged; `message` is safe to show the host. */
export class SynthesisError extends Error {}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function loadInputs(supabase: SupabaseClient) {
  const { data: state, error: stateError } = await supabase
    .from("app_state")
    .select("synthesis_mode, active_session_id, active_schedule_item_id")
    .limit(1)
    .maybeSingle();
  check(stateError);
  const mode = (state?.synthesis_mode ?? "manual") as SynthesisMode;
  return {
    mode,
    sessionId: (state?.active_session_id as string | null) ?? null,
    scheduleItemId: (state?.active_schedule_item_id as string | null) ?? null,
  };
}

/** Transcript since the last successful run, capped at WINDOW_MAX_AGE_MS. */
async function loadSegments(supabase: SupabaseClient): Promise<WindowSegment[]> {
  const { data: last, error: lastError } = await supabase
    .from("synthesis_runs")
    .select("window_end")
    .is("error", null)
    .not("window_end", "is", null)
    .order("window_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(lastError);
  const floor = new Date(Date.now() - WINDOW_MAX_AGE_MS).toISOString();
  const since = last?.window_end && last.window_end > floor ? (last.window_end as string) : floor;

  const { data, error } = await supabase
    .from("transcript_segments")
    .select("id, text, created_at")
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(150);
  check(error);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: r.text as string,
    createdAt: r.created_at as string,
  }));
}

async function loadQuestion(supabase: SupabaseClient, scheduleItemId: string | null) {
  if (!scheduleItemId) return null;
  const { data } = await supabase
    .from("schedule_items")
    .select("question")
    .eq("id", scheduleItemId)
    .maybeSingle();
  return (data?.question as string | null) ?? null;
}

async function loadBlocked(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("garden_nodes")
    .select("label, status")
    .in("status", ["draft", "rejected"])
    .limit(1000);
  check(error);
  return (data ?? []) as { label: string; status: "draft" | "rejected" }[];
}

async function savePlan(
  supabase: SupabaseClient,
  plan: SynthesisPlan,
  { mode, sessionId, runId }: { mode: SynthesisMode; sessionId: string | null; runId: string },
) {
  const status = mode === "auto" ? "published" : "draft";
  const idForKey = new Map<string, string>();

  if (plan.nodes.length > 0) {
    const { data, error } = await supabase
      .from("garden_nodes")
      .insert(
        plan.nodes.map((n) => ({
          tier: n.tier,
          label: n.label,
          description: n.rationale || null,
          status,
          origin: "ai",
          origin_session_id: sessionId,
          source_segment_ids: n.segmentIds,
        })),
      )
      .select("id");
    check(error);
    // Postgres returns inserted rows in the order given.
    (data ?? []).forEach((row, i) => idForKey.set(plan.nodes[i].key, row.id as string));
  }

  const idOf = (ref: NodeRef) => (ref.kind === "existing" ? ref.id : idForKey.get(ref.key));
  const vines = plan.vines
    .map((v) => ({ source: idOf(v.source), target: idOf(v.target), kind: v.kind }))
    .filter((v) => v.source && v.target);
  if (vines.length > 0) {
    const { error } = await supabase.from("garden_vines").insert(
      vines.map((v) => ({
        source_node_id: v.source,
        target_node_id: v.target,
        kind: v.kind,
        status,
        origin: "ai",
        origin_session_id: sessionId,
      })),
    );
    check(error);
  }

  if (plan.reinforce.length > 0) {
    const { data, error } = await supabase
      .from("garden_reinforcements")
      .insert(
        plan.reinforce.map((r) => ({
          node_id: r.nodeId,
          run_id: runId,
          rationale: r.rationale || null,
          source_segment_ids: r.segmentIds,
        })),
      )
      .select("id");
    check(error);
    if (mode === "auto") {
      for (const row of data ?? []) {
        const { error: rpcError } = await supabase.rpc("approve_garden_reinforcement", {
          reinforcement_id: row.id,
        });
        check(rpcError);
      }
    }
  }
}

/**
 * One synthesis pass, run with the host's own Supabase session (RLS applies).
 * Never touches captions; any failure is logged to synthesis_runs and rethrown
 * as a SynthesisError for the admin notice.
 */
export async function runSynthesis(
  supabase: SupabaseClient,
  propose: typeof requestProposal = requestProposal,
): Promise<SynthesisResult> {
  const { mode, sessionId, scheduleItemId } = await loadInputs(supabase);
  if (mode === "manual") return { status: "skipped", reason: "manual" };

  const window = buildWindow(await loadSegments(supabase));
  if (!window.substantial) return { status: "skipped", reason: "quiet" };

  let reply: ModelReply | null = null;
  let runId: string | null = null;
  try {
    const [garden, question, blocked] = await Promise.all([
      fetchPublishedGarden(supabase),
      loadQuestion(supabase, scheduleItemId),
      loadBlocked(supabase),
    ]);
    const context = compactGarden(garden.nodes, garden.vines);
    reply = await propose({
      system: SYSTEM_PROMPT,
      user: buildUserMessage({ question, garden: context, window }),
    });
    const plan = planFromProposal(reply.proposal, {
      segmentRefs: window.refs,
      nodeRefs: context.refs,
      published: garden.nodes,
      publishedVines: garden.vines,
      blocked,
    });

    const { data: run, error: runError } = await supabase
      .from("synthesis_runs")
      .insert({
        session_id: sessionId,
        window_start: window.start,
        window_end: window.end,
        mode,
        raw_output: { model: reply.model, usage: reply.usage, proposal: reply.proposal, dropped: plan.dropped },
      })
      .select("id")
      .single();
    check(runError);
    runId = run!.id as string;
    await savePlan(supabase, plan, { mode, sessionId, runId });

    return {
      status: "ok",
      mode,
      runId,
      added: { nodes: plan.nodes.length, vines: plan.vines.length, reinforce: plan.reinforce.length },
      dropped: plan.dropped.length,
    };
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 2000);
    const log = runId
      ? supabase.from("synthesis_runs").update({ error: message }).eq("id", runId)
      : supabase.from("synthesis_runs").insert({
          session_id: sessionId,
          window_start: window.start,
          window_end: window.end,
          mode,
          raw_output: reply ? { model: reply.model, proposal: reply.proposal } : null,
          error: message,
        });
    await log.then(
      () => undefined,
      () => undefined,
    );
    throw new SynthesisError(message);
  }
}
