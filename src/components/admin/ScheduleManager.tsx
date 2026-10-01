"use client";

import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FestivalState, ScheduleItem } from "@/lib/realtime/festival-state";
import {
  QUESTION_MAX,
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
  setLiveItem,
  updateScheduleItem,
} from "@/lib/schedule/schedule-db";
import { toVenueIso, venueTime } from "@/lib/schedule/time";
import { createClient } from "@/lib/supabase/client";

const input = "rounded-xl border border-festival-ink/20 bg-festival-cream px-3 py-2";
const primaryButton =
  "rounded-full bg-festival-forest px-4 py-1.5 font-semibold text-festival-cream transition hover:brightness-110 disabled:opacity-40";
const secondaryButton =
  "rounded-full border border-festival-forest px-3 py-1 text-sm font-semibold text-festival-forest transition hover:bg-festival-forest/10 disabled:opacity-40";

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
    const result = validateDraft(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    if ((await onSubmit(result.value)) && !onCancel) setDraft(EMPTY_DRAFT);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[8rem_1fr]">
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
        <span className="text-sm font-semibold">Title (shown in the Now · Next strip)</span>
        <input
          className={input}
          maxLength={TITLE_MAX}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-semibold">Live question (shown on the TVs when this item is live)</span>
        <textarea
          className={input}
          rows={2}
          maxLength={QUESTION_MAX}
          value={draft.question}
          onChange={(e) => setDraft({ ...draft, question: e.target.value })}
        />
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
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

export function ScheduleManager({ state, loaded }: { state: FestivalState; loaded: boolean }) {
  const { appState, sessions, schedule } = state;
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayId = pickedDay ?? appState.activeSessionId ?? sessions[0]?.id ?? null;
  const day = sessions.find((s) => s.id === dayId) ?? null;
  const items = dayItems(schedule, dayId);
  const isActiveDay = dayId !== null && dayId === appState.activeSessionId;
  const liveId = appState.activeScheduleItemId;
  const { now, next } = nowAndNext(items, liveId);
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

  const fields = (value: ValidDraft) => ({
    title: value.title,
    question: value.question,
    startsAt: value.time && day ? toVenueIso(day.date, value.time) : null,
  });

  function remove(item: ScheduleItem) {
    const warning = item.id === liveId ? " It's on the TVs now — they'll stop showing a question." : "";
    if (!window.confirm(`Delete "${item.title}"?${warning}`)) return;
    void run((sb) => deleteScheduleItem(sb, item.id));
  }

  return (
    <section className="rounded-3xl bg-white/60 p-6 shadow-poster">
      <h2 className="font-display text-3xl font-semibold">Schedule &amp; live question</h2>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Which day to edit">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === dayId}
            onClick={() => {
              setPickedDay(s.id);
              setEditingId(null);
            }}
            className={`rounded-full px-4 py-1.5 font-semibold transition ${
              s.id === dayId
                ? "bg-festival-forest text-festival-cream"
                : "border border-festival-forest text-festival-forest hover:bg-festival-forest/10"
            }`}
          >
            {s.title} · {s.date}
            {s.id === appState.activeSessionId && " (on TVs)"}
          </button>
        ))}
      </div>

      {isActiveDay ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-festival-marigold/25 px-4 py-3">
          <p className="min-w-0 flex-1">
            <span className="font-semibold">On the TVs: </span>
            {now ? now.question || now.title : <span className="opacity-70">no question yet</span>}
          </p>
          {next && (
            <button type="button" className={primaryButton} disabled={disabled} onClick={() => void run((sb) => setLiveItem(sb, next.id))}>
              {now ? "Next question →" : "Start with first item →"}
            </button>
          )}
          {liveId && (
            <button type="button" className={secondaryButton} disabled={disabled} onClick={() => void run((sb) => setLiveItem(sb, null))}>
              Clear
            </button>
          )}
        </div>
      ) : (
        day && (
          <p className="mt-4 rounded-2xl bg-festival-denim/10 px-4 py-3">
            Preparing <strong>{day.title}</strong>. Switch the festival day above to put these on the TVs.
          </p>
        )
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-festival-terracotta/15 px-4 py-2" role="alert">
          {error}
        </p>
      )}

      <ol className="mt-4 flex flex-col gap-3">
        {items.map((item, index) => {
          const live = isActiveDay && item.id === liveId;
          if (item.id === editingId) {
            return (
              <li key={item.id} className="rounded-2xl border border-festival-forest bg-festival-cream p-4">
                <ItemForm
                  initial={{ title: item.title, question: item.question ?? "", time: venueTime(item.startsAt) }}
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
                      ON TVs
                    </span>
                  )}
                </p>
                {item.question && <p className="mt-1 italic opacity-80">{item.question}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isActiveDay && !live && (
                  <button type="button" className={secondaryButton} disabled={disabled} onClick={() => void run((sb) => setLiveItem(sb, item.id))}>
                    Show on TVs
                  </button>
                )}
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={disabled || index === 0}
                  aria-label={`Move ${item.title} up`}
                  onClick={() => void run((sb) => applySortUpdates(sb, moveItem(items, item.id, -1)))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={disabled || index === items.length - 1}
                  aria-label={`Move ${item.title} down`}
                  onClick={() => void run((sb) => applySortUpdates(sb, moveItem(items, item.id, 1)))}
                >
                  ↓
                </button>
                <button type="button" className={secondaryButton} disabled={disabled} onClick={() => setEditingId(item.id)}>
                  Edit
                </button>
                <button type="button" className={secondaryButton} disabled={disabled} onClick={() => remove(item)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
        {loaded && items.length === 0 && day && <li className="opacity-70">No items for {day.title} yet.</li>}
      </ol>

      {day && (
        <div className="mt-6 border-t border-festival-ink/10 pt-4">
          <h3 className="mb-3 font-semibold">Add an item to {day.title}</h3>
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
    </section>
  );
}
