"use client";

import { ArrowDown, ArrowUp, CalendarClock, Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useNow } from "@/components/useNow";
import { toAppStatePatch } from "@/lib/realtime/app-state";
import type { FestivalState, ScheduleItem } from "@/lib/realtime/festival-state";
import {
  TITLE_MAX,
  dayItems,
  moveItem,
  nextSortOrder,
  nowAndNext,
  validateDraft,
  type ScheduleDraft,
  type ValidDraft,
} from "@/lib/schedule/schedule";
import {
  addScheduleItem,
  applySortUpdates,
  deleteScheduleItem,
  updateScheduleItem,
} from "@/lib/schedule/schedule-db";
import { toVenueIso, venueTime } from "@/lib/schedule/time";
import { createClient } from "@/lib/supabase/client";
import {
  dangerButton,
  errorNotice,
  input,
  outlineButton,
  Panel,
  primaryButton,
  secondaryButton,
} from "./ui";

const ICON = { "aria-hidden": true, size: 16, strokeWidth: 1.75 } as const;

const EMPTY_DRAFT: ScheduleDraft = { title: "", question: "", time: "" };

function ItemForm({
  initial,
  submitLabel,
  disabled,
  onSubmit,
  onCancel,
}: {
  initial: ScheduleDraft;
  submitLabel: string;
  disabled: boolean;
  onSubmit: (value: ValidDraft) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateDraft({ ...draft, question: "" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    if ((await onSubmit(result.value)) && !onCancel) setDraft(EMPTY_DRAFT);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 @md:grid-cols-[8rem_1fr]">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Time</span>
        <input
          type="time"
          className={input}
          value={draft.time}
          onChange={(e) => setDraft({ ...draft, time: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Title (Now · Next strip)</span>
        <input
          className={input}
          maxLength={TITLE_MAX}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </label>
      <div className="flex items-center gap-3 @md:col-span-2">
        <button type="submit" className={primaryButton} disabled={disabled}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={secondaryButton} onClick={onCancel}>
            Cancel
          </button>
        )}
        {error && (
          <span className="text-sm font-semibold text-festival-terracotta" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

/** Timed discussion blocks for the Now · Next strip — festival day picker included. */
export function ScheduleManager({ state, loaded }: { state: FestivalState; loaded: boolean }) {
  const { appState, sessions, schedule } = state;
  const nowMs = useNow(15_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const dayId = appState.activeSessionId ?? sessions[0]?.id ?? null;
  const day = sessions.find((s) => s.id === dayId) ?? null;
  const items = dayItems(schedule, dayId);
  const { now: clockNow } = nowAndNext(items, nowMs);
  const disabled = !loaded || busy;

  async function run(action: (supabase: SupabaseClient) => Promise<void>): Promise<boolean> {
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
  }

  async function selectDay(sessionId: string) {
    if (sessionId === appState.activeSessionId) return;
    const label = sessions.find((s) => s.id === sessionId)?.title ?? "that day";
    if (
      !window.confirm(
        `Put ${label} on the TVs? This also files new transcript rows under that day. The garden stays shared.`,
      )
    ) {
      return;
    }
    setEditingId(null);
    await run(async (sb) => {
      const { error: dbError } = await sb
        .from("app_state")
        .update(
          toAppStatePatch({
            activeSessionId: sessionId,
            activeScheduleItemId: null,
            activeLiveInquiryId: null,
          }),
        )
        .eq("id", true);
      if (dbError) throw new Error(dbError.message);
    });
  }

  const fields = (value: ValidDraft) => ({
    title: value.title,
    question: null as string | null,
    startsAt: value.time && day ? toVenueIso(day.date, value.time) : null,
  });

  function remove(item: ScheduleItem) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    void run((sb) => deleteScheduleItem(sb, item.id));
  }

  return (
    <Panel
      id="schedule"
      title="Schedule"
      icon={CalendarClock}
      description="Pick the festival day (on TVs + transcripts), then edit timed blocks. Now · Next follows the computer clock from each item's start time."
    >
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Festival day">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === dayId}
            disabled={disabled}
            onClick={() => void selectDay(s.id)}
            className={s.id === dayId ? primaryButton : outlineButton}
          >
            {s.title} · {s.date}
            {s.id === appState.activeSessionId && " (on TVs)"}
          </button>
        ))}
      </div>

      {error && (
        <p className={`mt-3 ${errorNotice}`} role="alert">
          {error}
        </p>
      )}

      <ol className="mt-4 flex flex-col gap-3">
        {items.map((item, index) => {
          const live = clockNow?.id === item.id;
          if (item.id === editingId) {
            return (
              <li key={item.id} className="rounded-2xl border border-festival-forest bg-festival-cream p-4">
                <ItemForm
                  initial={{ title: item.title, question: "", time: venueTime(item.startsAt) }}
                  submitLabel="Save"
                  disabled={disabled}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (value) => {
                    const ok = await run((sb) => updateScheduleItem(sb, item.id, fields(value)));
                    if (ok) setEditingId(null);
                    return ok;
                  }}
                />
              </li>
            );
          }
          return (
            <li
              key={item.id}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-festival-cream p-4 ${
                live ? "border-2 border-festival-marigold" : "border border-festival-ink/10"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-semibold tabular-nums">{venueTime(item.startsAt) || "—"}</span>
                  <span className="font-semibold">{item.title}</span>
                  {live && (
                    <span className="rounded-full bg-festival-marigold px-2 py-0.5 text-xs font-bold text-festival-ink">
                      NOW
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={disabled || index === 0}
                  aria-label={`Move ${item.title} up`}
                  onClick={() => void run((sb) => applySortUpdates(sb, moveItem(items, item.id, -1)))}
                >
                  <ArrowUp {...ICON} />
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={disabled || index === items.length - 1}
                  aria-label={`Move ${item.title} down`}
                  onClick={() => void run((sb) => applySortUpdates(sb, moveItem(items, item.id, 1)))}
                >
                  <ArrowDown {...ICON} />
                </button>
                <button type="button" className={secondaryButton} disabled={disabled} onClick={() => setEditingId(item.id)}>
                  <Pencil {...ICON} />
                </button>
                <button type="button" className={dangerButton} disabled={disabled} onClick={() => remove(item)}>
                  <Trash2 {...ICON} />
                </button>
              </div>
            </li>
          );
        })}
        {loaded && items.length === 0 && day && <li className="opacity-70">No items for {day.title} yet.</li>}
      </ol>

      {day && (
        <div className="mt-6 border-t border-festival-ink/10 pt-4">
          <h3 className="mb-3 font-semibold">Add to {day.title}</h3>
          <ItemForm
            key={day.id}
            initial={EMPTY_DRAFT}
            submitLabel="Add"
            disabled={disabled}
            onSubmit={(value) =>
              run((sb) =>
                addScheduleItem(sb, { sessionId: day.id, sortOrder: nextSortOrder(items), ...fields(value) }),
              )
            }
          />
        </div>
      )}
    </Panel>
  );
}
