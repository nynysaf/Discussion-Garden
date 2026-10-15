"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { toAppStatePatch, type AppState } from "@/lib/realtime/app-state";
import type { FestivalState } from "@/lib/realtime/festival-state";
import { createClient } from "@/lib/supabase/client";
import { errorNotice, input, Panel } from "./ui";

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
    <Panel
      id="day"
      title="Festival day"
      icon={CalendarDays}
      description="Files the transcript under this day and picks which schedule the TVs show. The garden is shared across both days."
    >
      <label className="mt-4 flex max-w-md flex-col gap-1">
        <span className="text-sm font-semibold">Festival day</span>
        <select
          className={input}
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
      </label>
      {error && (
        <p className={`mt-3 ${errorNotice}`} role="alert">
          {error}
        </p>
      )}
    </Panel>
  );
}
