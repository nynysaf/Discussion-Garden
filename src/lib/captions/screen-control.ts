import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppStatePatch, type AppState } from "@/lib/realtime/app-state";
import { CAPTIONS_VIEWS, clampRotateSeconds, type CaptionsView } from "./layout";

// /admin "TV screen" changes as app_state patches. `shown` is what the TV shows right now,
// so changing a setting never makes the TV jump somewhere unexpected. Pure — tested.

type Patch = Partial<AppState>;

/** Show this view; when rotating, carry on rotating from it. */
export function pickView(view: CaptionsView, rotating: boolean, nowIso: string): Patch {
  return rotating ? { captionsLayout: view, captionsRotateSince: nowIso } : { captionsLayout: view };
}

/** Start (or re-time) auto-rotate from the view on the TV now. */
export function startRotation(shown: CaptionsView, seconds: number, nowIso: string): Patch {
  return {
    captionsLayout: shown,
    captionsRotateSeconds: clampRotateSeconds(seconds),
    captionsRotateSince: nowIso,
  };
}

/** Stop auto-rotate and stay on the view on the TV now. */
export function stopRotation(shown: CaptionsView): Patch {
  return { captionsLayout: shown, captionsRotateSeconds: null, captionsRotateSince: null };
}

/** Tick/untick a view in the rotation; restarts the cycle from the current view if rotating. */
export function toggleInRotation(
  rotation: CaptionsView[],
  view: CaptionsView,
  shown: CaptionsView,
  rotating: boolean,
  nowIso: string,
): Patch {
  const next = rotation.includes(view) ? rotation.filter((v) => v !== view) : [...rotation, view];
  const ordered = CAPTIONS_VIEWS.filter((v) => next.includes(v));
  return rotating
    ? { captionsRotation: ordered, captionsLayout: shown, captionsRotateSince: nowIso }
    : { captionsRotation: ordered };
}

export async function saveScreenPatch(supabase: SupabaseClient, patch: Patch) {
  const { error } = await supabase.from("app_state").update(toAppStatePatch(patch)).eq("id", true);
  if (error) throw new Error(error.message);
}
