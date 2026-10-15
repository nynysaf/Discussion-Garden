"use client";

import { Tv } from "lucide-react";
import { useState } from "react";
import { useCaptionsView } from "@/components/captions/useCaptionsView";
import {
  availableViews,
  CAPTIONS_VIEWS,
  ROTATE_DEFAULT_SECONDS,
  VIEW_LABELS,
  type CaptionsView,
} from "@/lib/captions/layout";
import {
  pickView,
  saveScreenPatch,
  startRotation,
  stopRotation,
  toggleInRotation,
} from "@/lib/captions/screen-control";
import type { FestivalState } from "@/lib/realtime/festival-state";
import { errorNotice, input, Panel, Toggle } from "./ui";
import { useHostAction } from "./useHostAction";

const SECONDS_CHOICES = [10, 15, 20, 30, 45, 60, 90, 120];

const UNAVAILABLE: Record<CaptionsView, string> = {
  garden: "The garden is hidden on TVs",
  both: "The garden is hidden on TVs",
  captions: "",
  highlight: "Nothing live or coming up today",
};

type Props = { state: FestivalState; loaded: boolean };

/** Picks what the downstairs /captions TV shows (DESIGN_GUIDE §5.1a–b). */
export function TvScreenPanel({ state, loaded }: Props) {
  const { appState } = state;
  const { view: shown, context, upcoming } = useCaptionsView(state);
  const { busy, error, run } = useHostAction();
  const rotating = appState.captionsRotateSeconds !== null;
  const [seconds, setSeconds] = useState(appState.captionsRotateSeconds ?? ROTATE_DEFAULT_SECONDS);
  const available = availableViews(context);
  const ticked = appState.captionsRotation;
  const rotatable = ticked.filter((v) => available.includes(v));
  const disabled = !loaded || busy;
  const nowIso = () => new Date().toISOString();

  return (
    <Panel
      id="tv"
      title="TV screen"
      icon={Tv}
      actions={
        <p className="text-sm" aria-live="polite">
          <span className="opacity-70">Downstairs TV now: </span>
          <strong>{VIEW_LABELS[shown]}</strong>
          {upcoming && (
            <span className="opacity-70">
              {" "}
              · {VIEW_LABELS[upcoming.view]} in {upcoming.inSeconds}s
            </span>
          )}
        </p>
      }
      description={
        <>
          Pick what <code>/captions</code> shows, or let it rotate. The live question, Now · Next and QR
          stay on every view; Highlight keeps a one-line caption.
        </>
      }
    >
      <div role="radiogroup" aria-label="TV view" className="mt-4 grid grid-cols-2 gap-3 @lg:grid-cols-4">
        {CAPTIONS_VIEWS.map((view) => {
          const isShown = view === shown;
          const canShow = available.includes(view);
          return (
            <button
              key={view}
              type="button"
              role="radio"
              aria-checked={isShown}
              disabled={disabled || !canShow}
              title={canShow ? undefined : UNAVAILABLE[view]}
              onClick={() => void run((c) => saveScreenPatch(c, pickView(view, rotating, nowIso())))}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isShown
                  ? "border-festival-forest bg-festival-green/30"
                  : "border-transparent bg-festival-cream hover:border-festival-forest/40"
              }`}
            >
              <ViewThumb view={view} />
              <span>{VIEW_LABELS[view]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-festival-ink/10 pt-4">
        <Toggle
          on={rotating}
          onLabel="Auto-rotate on"
          offLabel="Auto-rotate off"
          ariaLabel="Auto-rotate the TV views"
          disabled={disabled}
          onClick={() =>
            void run((c) =>
              saveScreenPatch(c, rotating ? stopRotation(shown) : startRotation(shown, seconds, nowIso())),
            )
          }
        />

        <label className="flex items-center gap-2 text-sm font-semibold">
          Every
          <select
            className={`${input} py-1`}
            disabled={disabled}
            value={rotating ? (appState.captionsRotateSeconds ?? seconds) : seconds}
            onChange={(e) => {
              const value = Number(e.target.value);
              setSeconds(value);
              if (rotating) void run((c) => saveScreenPatch(c, startRotation(shown, value, nowIso())));
            }}
          >
            {SECONDS_CHOICES.map((s) => (
              <option key={s} value={s}>
                {s} seconds
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <legend className="sr-only">Views in the rotation</legend>
          {CAPTIONS_VIEWS.map((view) => (
            <label key={view} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                className="size-4 accent-festival-forest"
                checked={ticked.includes(view)}
                disabled={disabled}
                onChange={() =>
                  void run((c) =>
                    saveScreenPatch(c, toggleInRotation(ticked, view, shown, rotating, nowIso())),
                  )
                }
              />
              {VIEW_LABELS[view]}
            </label>
          ))}
        </fieldset>
      </div>

      {rotating && rotatable.length < 2 && (
        <p className="mt-3 text-sm">
          Tick at least two views that can show right now — until then the TV stays on{" "}
          <strong>{VIEW_LABELS[shown]}</strong>.
        </p>
      )}
      {error && (
        <p className={`mt-3 ${errorNotice}`} role="alert">
          {error}
        </p>
      )}
    </Panel>
  );
}

/** Tiny 16:9 sketch of each view. */
function ViewThumb({ view }: { view: CaptionsView }) {
  const line = "h-1 rounded-full bg-festival-ink/40";
  return (
    <span aria-hidden className="flex aspect-video w-full max-w-28 gap-1 rounded-md bg-white p-1.5 ring-1 ring-festival-ink/10">
      {(view === "garden" || view === "both") && (
        <span className={`rounded-sm bg-festival-green ${view === "both" ? "w-[58%]" : "w-full"}`} />
      )}
      {(view === "captions" || view === "both") && (
        <span className="flex flex-1 flex-col justify-end gap-1">
          <span className={`${line} w-4/5`} />
          <span className={`${line} ml-auto w-3/5`} />
          <span className={`${line} w-full`} />
        </span>
      )}
      {view === "highlight" && (
        <span className="flex flex-1 flex-col items-center justify-center gap-1">
          <span className="h-1.5 w-4/5 rounded-full bg-festival-marigold" />
          <span className="h-1 w-1/2 rounded-full bg-festival-ink/40" />
        </span>
      )}
    </span>
  );
}
