"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { Connection } from "@/lib/captions/channel";
import { createRefetcher } from "@/lib/realtime/refetcher";
import { watchTables } from "@/lib/realtime/watch-tables";
import { createClient } from "@/lib/supabase/client";

/**
 * Data that re-fetches whenever one of `tables` changes and on every
 * (re)connect, so a screen that lost Wi-Fi catches up. Pass a module-level
 * `fetcher` and constant `tables` — they're read once on mount.
 */
export function useLiveData<T>(
  fetcher: (supabase: SupabaseClient) => Promise<T>,
  tables: string[],
  initial: T,
) {
  const [data, setData] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refetcher = createRefetcher({
      fetch: () => fetcher(supabase),
      onData: (next) => {
        setData(next);
        setLoaded(true);
        setError(null);
      },
      onError: (e) => setError(e instanceof Error ? e.message : String(e)),
    });
    const stop = watchTables(supabase, tables, refetcher.trigger, setConnection);
    refetcher.trigger();
    return () => {
      refetcher.cancel();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on mount (see doc comment)
  }, []);

  return { data, loaded, connection, error };
}
