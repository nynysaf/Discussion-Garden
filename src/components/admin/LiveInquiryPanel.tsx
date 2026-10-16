"use client";

import { MessageCircleQuestion, Trash2, Tv } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  addInquiry,
  clearLiveInquiry,
  deleteInquiry,
  makeInquiryLive,
} from "@/lib/inquiries/inquiries-db";
import { INQUIRY_MAX } from "@/lib/inquiries/limits";
import { validateInquiryBody } from "@/lib/inquiries/inquiries";
import type { FestivalState } from "@/lib/realtime/festival-state";
import { createClient } from "@/lib/supabase/client";
import {
  dangerButton,
  errorNotice,
  input,
  Panel,
  primaryButton,
  secondaryButton,
} from "./ui";
import { useHostAction } from "./useHostAction";

const ICON = { "aria-hidden": true, size: 16, strokeWidth: 1.75 } as const;

/** Quick live-inquiry log: add ahead, switch mid-talk, revisit earlier questions. */
export function LiveInquiryPanel({ state, loaded }: { state: FestivalState; loaded: boolean }) {
  const { appState, inquiries } = state;
  const sessionId = appState.activeSessionId;
  const liveId = appState.activeLiveInquiryId;
  const { busy, error, run } = useHostAction();
  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const disabled = !loaded || busy;

  async function onAdd(event: FormEvent, makeLive: boolean) {
    event.preventDefault();
    const result = validateInquiryBody(draft);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormError(null);
    const ok = await run((sb) => addInquiry(sb, result.body, sessionId, makeLive));
    if (ok) setDraft("");
  }

  function remove(id: string, body: string) {
    if (!window.confirm(`Delete this inquiry?\n\n“${body}”`)) return;
    void run((sb) => deleteInquiry(sb, id));
  }

  return (
    <Panel
      id="inquiry"
      title="Live question"
      icon={MessageCircleQuestion}
      description="What the TVs show as Live inquiry / Highlight. Separate from the timed schedule."
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void onAdd(e, true)}>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">New inquiry</span>
          <textarea
            className={input}
            rows={2}
            maxLength={INQUIRY_MAX}
            value={draft}
            placeholder="Type a question and put it live…"
            onChange={(e) => setDraft(e.target.value)}
          />
          <span className="self-end text-sm opacity-70">
            {INQUIRY_MAX - draft.trim().length} left
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryButton} disabled={disabled || !draft.trim()}>
            <Tv {...ICON} /> Add &amp; make live
          </button>
          <button
            type="button"
            className={secondaryButton}
            disabled={disabled || !draft.trim()}
            onClick={(e) => {
              e.preventDefault();
              void onAdd(e, false);
            }}
          >
            Add to list only
          </button>
        </div>
        {(formError || error) && (
          <p className={errorNotice} role="alert">
            {formError ?? error}
          </p>
        )}
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-festival-marigold/25 px-4 py-3">
        <p className="min-w-0 flex-1">
          <span className="font-semibold">Live now: </span>
          {liveId ? (
            inquiries.find((q) => q.id === liveId)?.body ?? "(missing)"
          ) : (
            <span className="opacity-70">none — schedule footer only</span>
          )}
        </p>
        {liveId && (
          <button
            type="button"
            className={secondaryButton}
            disabled={disabled}
            onClick={() => void run((sb) => clearLiveInquiry(sb))}
          >
            Clear
          </button>
        )}
      </div>

      <ol className="mt-4 flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
        {inquiries.map((q) => {
          const live = q.id === liveId;
          return (
            <li
              key={q.id}
              className={`flex flex-wrap items-start justify-between gap-2 rounded-2xl bg-festival-cream p-3 ${
                live ? "border-2 border-festival-marigold" : "border border-festival-ink/10"
              }`}
            >
              <p className="min-w-0 flex-1 font-medium leading-snug">
                {q.body}
                {live && (
                  <span className="ml-2 rounded-full bg-festival-marigold px-2 py-0.5 text-xs font-bold">
                    LIVE
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {!live && (
                  <button
                    type="button"
                    className={secondaryButton}
                    disabled={disabled}
                    onClick={() => void run((sb) => makeInquiryLive(sb, q.id, sessionId))}
                  >
                    <Tv {...ICON} /> Make live
                  </button>
                )}
                <button
                  type="button"
                  className={dangerButton}
                  disabled={disabled}
                  aria-label="Delete inquiry"
                  onClick={() => remove(q.id, q.body)}
                >
                  <Trash2 {...ICON} />
                </button>
              </div>
            </li>
          );
        })}
        {loaded && inquiries.length === 0 && (
          <li className="opacity-70">No inquiries yet — add one above, even before the day starts.</li>
        )}
      </ol>
    </Panel>
  );
}
