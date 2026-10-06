"use client";

import { useState } from "react";
import { useDrafts } from "@/components/realtime/useDrafts";
import type { AppState, SynthesisMode } from "@/lib/realtime/app-state";
import { venueTime } from "@/lib/schedule/time";
import { approveAllSteps, buildQueue, describeResult } from "@/lib/synthesis/drafts";
import { approveAll, requestSuggestions, setSynthesisMode } from "@/lib/synthesis/drafts-db";
import { primaryButton, secondaryButton } from "../garden/styles";
import { useHostAction } from "../useHostAction";
import { DraftCard } from "./DraftCard";

const MODES: { mode: SynthesisMode; name: string; hint: string }[] = [
  { mode: "manual", name: "Manual", hint: "AI is off. You plant everything by hand." },
  { mode: "hybrid", name: "Hybrid", hint: "AI suggests ideas; nothing reaches the TVs until you approve it." },
  { mode: "auto", name: "Auto", hint: "AI ideas go straight to the TVs. Use only if Hybrid gets too busy." },
];

type Props = { appState: AppState; stateLoaded: boolean };

export function DraftsPanel({ appState, stateLoaded }: Props) {
  const { drafts, loaded, error: loadError } = useDrafts();
  const { busy, error, run } = useHostAction();
  const [suggesting, setSuggesting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null);
  const mode = appState.synthesisMode;
  const queue = buildQueue(drafts);
  const lastRun = drafts.lastRun;

  function pickMode(next: SynthesisMode) {
    if (next === mode) return;
    if (
      next === "auto" &&
      !window.confirm("Auto puts AI ideas on the TVs without your review. Switch to Auto?")
    ) {
      return;
    }
    void run((s) => setSynthesisMode(s, next));
  }

  async function suggestNow() {
    setSuggesting(true);
    setNotice(null);
    try {
      setNotice({ text: describeResult(await requestSuggestions()), failed: false });
    } catch (e) {
      setNotice({ text: e instanceof Error ? e.message : "The garden AI couldn't run.", failed: true });
    } finally {
      setSuggesting(false);
    }
  }

  function approveEverything() {
    if (!window.confirm(`Approve all ${queue.length} suggestions? They appear on the TVs right away.`)) return;
    void run((s) => approveAll(s, approveAllSteps(queue)));
  }

  return (
    <section className="rounded-3xl bg-white/60 p-6 shadow-poster">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-3xl font-semibold">
          AI drafts {loaded && queue.length > 0 && <span className="font-normal opacity-70">({queue.length})</span>}
        </h2>
        <div role="radiogroup" aria-label="Garden AI mode" className="flex rounded-full bg-festival-forest/10 p-1">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={mode === m.mode}
              disabled={!stateLoaded || busy}
              onClick={() => pickMode(m.mode)}
              className={`rounded-full px-4 py-1.5 font-semibold transition disabled:opacity-40 ${
                mode === m.mode
                  ? m.mode === "auto"
                    ? "bg-festival-marigold text-festival-ink"
                    : "bg-festival-forest text-festival-cream"
                  : "text-festival-forest hover:bg-festival-forest/10"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm opacity-70">{MODES.find((m) => m.mode === mode)?.hint}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={primaryButton}
          disabled={!stateLoaded || mode === "manual" || suggesting}
          onClick={() => void suggestNow()}
        >
          {suggesting ? "Asking the AI…" : "Suggest now"}
        </button>
        <span className="text-sm opacity-70">
          {mode === "manual"
            ? "Switch to Hybrid to get suggestions."
            : "Reads the talk since the AI last ran."}
          {lastRun && (
            <>
              {" "}Last run {venueTime(lastRun.createdAt)}
              {lastRun.error ? " — it failed." : "."}
            </>
          )}
        </span>
      </div>

      {notice && (
        <p
          className={`mt-3 rounded-xl px-4 py-2 ${notice.failed ? "bg-festival-terracotta/15" : "bg-festival-green/25"}`}
          role={notice.failed ? "alert" : "status"}
        >
          {notice.text}
        </p>
      )}
      {(error ?? loadError) && (
        <p className="mt-3 rounded-xl bg-festival-terracotta/15 px-4 py-2" role="alert">
          {error ?? `Can't load drafts: ${loadError}`}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">Waiting for review</h3>
        {queue.length > 1 && (
          <button type="button" className={secondaryButton} disabled={busy} onClick={approveEverything}>
            Approve all ({queue.length})
          </button>
        )}
      </div>
      {loaded && queue.length === 0 && (
        <p className="mt-3 opacity-70">
          Nothing waiting. {mode === "hybrid" ? "New suggestions appear here." : ""}
        </p>
      )}
      <ul className="mt-3 flex max-h-[40rem] flex-col gap-2 overflow-y-auto pr-1">
        {queue.map((item) => (
          <DraftCard key={`${item.type}:${item.id}`} item={item} busy={busy} run={run} />
        ))}
      </ul>
    </section>
  );
}
