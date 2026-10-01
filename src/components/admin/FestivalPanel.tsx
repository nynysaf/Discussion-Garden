"use client";

import { useState } from "react";
import { toAppStatePatch, type AppState } from "@/lib/realtime/app-state";
import type { FestivalState } from "@/lib/realtime/festival-state";
import { createClient } from "@/lib/supabase/client";

const select =
  "rounded-xl border border-festival-ink/20 bg-festival-cream px-3 py-2 disabled:opacity-50";

export function FestivalPanel({ state, loaded }: { state: FestivalState; loaded: boolean }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { appState, sessions } = state;

  async function save(patch: Partial<AppState>) {
    setSaving(true);
    setError(null);
    try {
      const { error: dbError } = await createClient()
        .from("app_state")
        .update(toAppStatePatch(patch))
        .eq("id", true);
      if (dbError) setError(dbError.message);
    } catch {
      setError("Couldn't save — check the connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white/60 p-6 shadow-poster">
      <h2 className="font-display text-3xl font-semibold">Festival day</h2>
      <div className="mt-4 max-w-md">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Festival day</span>
          <select
            className={select}
            disabled={!loaded || saving}
            value={appState.activeSessionId ?? ""}
            onChange={(e) =>
              void save({ activeSessionId: e.target.value || null, activeScheduleItemId: null })
            }
          >
            <option value="">— none —</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.date}
              </option>
            ))}
          </select>
          <span className="text-sm opacity-70">
            Files the transcript under this day and picks which schedule the TVs show. The garden is
            shared across both days.
          </span>
        </label>
      </div>
      {error && (
        <p className="mt-3 rounded-xl bg-festival-terracotta/15 px-4 py-2" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
