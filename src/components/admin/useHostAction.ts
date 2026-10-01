"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Client = ReturnType<typeof createClient>;

/** Runs one host write at a time, with a busy flag and a readable error. Resolves true on success. */
export function useHostAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: (supabase: Client) => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action(createClient());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save — check the connection.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run };
}

export type HostRun = ReturnType<typeof useHostAction>["run"];
