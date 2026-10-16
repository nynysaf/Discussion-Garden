"use client";

import { useEffect, useRef } from "react";
import { useNow } from "@/components/useNow";
import { toAppStatePatch } from "@/lib/realtime/app-state";
import type { FestivalState } from "@/lib/realtime/festival-state";
import { sessionForClock } from "@/lib/schedule/schedule";
import { createClient } from "@/lib/supabase/client";

/**
 * Keep `app_state.active_session_id` aligned with the venue calendar day
 * (`day_0` / `day_1` / `day_2`). Editing another day's schedule must not call this —
 * only the clock does. Outside those three dates the DB row is left alone.
 */
export function useSyncCalendarSession(state: FestivalState, loaded: boolean) {
  const nowMs = useNow(60_000);
  const writing = useRef(false);

  useEffect(() => {
    if (!loaded || writing.current) return;
    const clock = sessionForClock(state.sessions, nowMs);
    if (!clock || clock.id === state.appState.activeSessionId) return;

    writing.current = true;
    void (async () => {
      try {
        await createClient()
          .from("app_state")
          .update(
            toAppStatePatch({
              activeSessionId: clock.id,
              activeScheduleItemId: null,
              // Keep the live inquiry — host may still want it; day roll only retargets filing.
            }),
          )
          .eq("id", true);
      } finally {
        writing.current = false;
      }
    })();
  }, [loaded, nowMs, state.sessions, state.appState.activeSessionId]);
}
