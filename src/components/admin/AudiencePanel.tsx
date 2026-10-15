"use client";

import { Eye, EyeOff, MessageSquare, Pin, PinOff } from "lucide-react";
import { useState } from "react";
import { useSubmissions } from "@/components/realtime/useSubmissions";
import type { AppState } from "@/lib/realtime/app-state";
import { venueTime } from "@/lib/schedule/time";
import {
  setHighlighted,
  setSubmissionHidden,
  setSubmissionsOpen,
} from "@/lib/submissions/submissions-db";
import { createClient } from "@/lib/supabase/client";
import { errorNotice, Panel, secondaryButton, Toggle } from "./ui";

const ICON = { "aria-hidden": true, size: 16, strokeWidth: 1.75 } as const;

type Props = { appState: AppState; stateLoaded: boolean };

export function AudiencePanel({ appState, stateLoaded }: Props) {
  const { submissions, loaded, error: loadError } = useSubmissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = appState.submissionsOpen;
  const visibleCount = submissions.filter((s) => !s.hidden).length;

  async function run(action: (supabase: ReturnType<typeof createClient>) => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action(createClient());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save — check the connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      id="audience"
      title="Audience messages"
      icon={MessageSquare}
      actions={
        <Toggle
          on={open}
          onLabel="Sharing open"
          offLabel="Sharing paused"
          ariaLabel="Audience sharing"
          offIsWarning
          disabled={!stateLoaded || busy}
          onClick={() => void run((s) => setSubmissionsOpen(s, !open))}
        />
      }
      description={
        <>
          Messages from <code>/audience</code> appear on the room TV straight away. Hide anything that
          shouldn&apos;t be there; pin one to show it&apos;s being discussed.
          {loaded && ` ${visibleCount} on the TV.`}
        </>
      }
    >
      {(error ?? loadError) && (
        <p className={`mt-3 ${errorNotice}`} role="alert">
          {error ?? `Can't load messages: ${loadError}`}
        </p>
      )}

      {loaded && submissions.length === 0 && (
        <p className="mt-4 opacity-70">No messages yet.</p>
      )}

      <ul className="mt-4 flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1">
        {submissions.map((s) => {
          const pinned = appState.highlightedSubmissionId === s.id;
          return (
            <li
              key={s.id}
              className={`rounded-2xl px-4 py-3 ${
                pinned
                  ? "bg-festival-marigold/25 ring-2 ring-festival-marigold"
                  : s.hidden
                    ? "bg-festival-ink/5 opacity-60"
                    : "bg-festival-cream"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={`whitespace-pre-line break-words ${s.hidden ? "line-through" : ""}`}>
                    {s.body}
                  </p>
                  <p className="mt-1 text-sm opacity-70">
                    {s.nameTag ?? "Anonymous"} · {venueTime(s.createdAt)}
                    {pinned && " · 📌 Pinned on TV"}
                    {s.hidden && " · Hidden"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!s.hidden && (
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={busy}
                      onClick={() => void run((c) => setHighlighted(c, pinned ? null : s.id))}
                    >
                      {pinned ? <PinOff {...ICON} /> : <Pin {...ICON} />}
                      {pinned ? "Unpin" : "Pin"}
                    </button>
                  )}
                  <button
                    type="button"
                    className={secondaryButton}
                    disabled={busy}
                    onClick={() => void run((c) => setSubmissionHidden(c, s.id, !s.hidden))}
                  >
                    {s.hidden ? <Eye {...ICON} /> : <EyeOff {...ICON} />}
                    {s.hidden ? "Show" : "Hide"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
