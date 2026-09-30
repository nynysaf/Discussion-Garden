"use client";

import { useEffect, useState } from "react";
import type { Connection } from "@/lib/captions/channel";
import {
  EMPTY_FESTIVAL_STATE,
  FESTIVAL_TABLES,
  fetchFestivalState,
  type FestivalState,
} from "@/lib/realtime/festival-state";
import { createRefetcher } from "@/lib/realtime/refetcher";
import { watchTables } from "@/lib/realtime/watch-tables";
import { createClient } from "@/lib/supabase/client";

/** Live app state + days + schedule, kept fresh through reconnects. */
export function useFestivalState() {
  const [state, setState] = useState<FestivalState>(EMPTY_FESTIVAL_STATE);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refetcher = createRefetcher({
      fetch: () => fetchFestivalState(supabase),
      onData: (data) => {
        setState(data);
        setLoaded(true);
        setError(null);
      },
      onError: (e) => setError(e instanceof Error ? e.message : String(e)),
    });
    const stop = watchTables(supabase, FESTIVAL_TABLES, refetcher.trigger, setConnection);
    refetcher.trigger();
    return () => {
      refetcher.cancel();
      stop();
    };
  }, []);

  return { state, loaded, connection, error };
}
