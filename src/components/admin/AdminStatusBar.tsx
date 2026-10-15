"use client";

import { SkipForward } from "lucide-react";
import { useCaptionsView } from "@/components/captions/useCaptionsView";
import { StatusPill } from "@/components/StatusPill";
import { VIEW_LABELS } from "@/lib/captions/layout";
import type { FestivalState } from "@/lib/realtime/festival-state";
import { setLiveItem } from "@/lib/schedule/schedule-db";
import { errorNotice, primaryButton } from "./ui";
import { useHostAction } from "./useHostAction";

const JUMPS = [
  { id: "captions", label: "Captions" },
  { id: "tv", label: "TV screen" },
  { id: "day", label: "Day" },
  { id: "schedule", label: "Schedule" },
  { id: "drafts", label: "AI drafts" },
  { id: "audience", label: "Audience" },
  { id: "garden", label: "Garden" },
];

/** Always-visible summary of what the room sees, plus the one action hosts need mid-talk. */
export function AdminStatusBar({ state, loaded }: { state: FestivalState; loaded: boolean }) {
  const { now, next, view, upcoming } = useCaptionsView(state);
  const { busy, error, run } = useHostAction();
  const { audioStatus } = state.appState;

  return (
    <div className="sticky top-0 z-30 -mx-6 border-b border-festival-ink/10 bg-festival-cream/95 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <StatusPill status={audioStatus} className="text-base" />

        <p className="min-w-0 flex-1 basis-80">
          <span className="text-sm font-semibold uppercase tracking-wide opacity-70">On TVs </span>
          {now ? (
            <span className="font-semibold">{now.question || now.title}</span>
          ) : (
            <span className="opacity-70">no question yet</span>
          )}
          <span className="block text-sm opacity-70" aria-live="polite">
            Screen: {VIEW_LABELS[view]}
            {upcoming && ` · ${VIEW_LABELS[upcoming.view]} in ${upcoming.inSeconds}s`}
            {next && ` · Up next: ${next.title}`}
          </span>
        </p>

        {next && (
          <button
            type="button"
            className={`${primaryButton} px-5 py-2`}
            disabled={!loaded || busy}
            onClick={() => void run((sb) => setLiveItem(sb, next.id))}
          >
            <SkipForward aria-hidden size={18} strokeWidth={1.75} />
            {now ? "Next question" : "Start first item"}
          </button>
        )}
      </div>

      {error && (
        <p className={`mt-2 ${errorNotice}`} role="alert">
          {error}
        </p>
      )}

      <nav aria-label="Jump to panel" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {JUMPS.map((j) => (
          <a key={j.id} href={`#${j.id}`} className="text-festival-forest underline-offset-4 hover:underline">
            {j.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
