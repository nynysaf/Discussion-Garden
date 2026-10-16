"use client";

import { useEffect, useRef } from "react";
import { useNow } from "@/components/useNow";
import { toAppStatePatch } from "@/lib/realtime/app-state";
import type { FestivalState } from "@/lib/realtime/festival-state";
import { sessionForClock } from "@/lib/schedule/schedule";
import { createClient } from "@/lib/supabase/client";

/**
 * Keep `app_state.active_session_id` aligned with the venue calendar day.
 * Editing another day's schedule in the admin UI must not call this — only the clock does.
 * Days outside the festival (e.g. Friday) leave the DB row alone so rehearsal can still file
 * under the seeded day until Saturday/Sunday arrive.
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
