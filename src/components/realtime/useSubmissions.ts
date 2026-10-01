"use client";

import { useEffect, useState } from "react";
import type { Connection } from "@/lib/captions/channel";
import { createRefetcher } from "@/lib/realtime/refetcher";
import { watchTables } from "@/lib/realtime/watch-tables";
import { FEED_TABLES, fetchSubmissions, type Submission } from "@/lib/submissions/feed";
import { createClient } from "@/lib/supabase/client";

/** Audience messages, kept fresh through changes, hides, and reconnects. */
export function useSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refetcher = createRefetcher({
      fetch: () => fetchSubmissions(supabase),
      onData: (data) => {
        setSubmissions(data);
        setLoaded(true);
        setError(null);
      },
      onError: (e) => setError(e instanceof Error ? e.message : String(e)),
    });
    const stop = watchTables(supabase, FEED_TABLES, refetcher.trigger, setConnection);
    refetcher.trigger();
    return () => {
      refetcher.cancel();
      stop();
    };
  }, []);

  return { submissions, loaded, connection, error };
}
