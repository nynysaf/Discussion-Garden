"use client";

import { useCaptionsView } from "@/components/captions/useCaptionsView";
import { StatusPill } from "@/components/StatusPill";
import { VIEW_LABELS } from "@/lib/captions/layout";
import { activeLiveInquiry } from "@/lib/realtime/festival-state";
import type { FestivalState } from "@/lib/realtime/festival-state";
const JUMPS = [
  { id: "captions", label: "Captions" },
  { id: "tv", label: "TV screen" },
  { id: "schedule", label: "Schedule" },
  { id: "inquiry", label: "Live question" },
  { id: "drafts", label: "AI drafts" },
  { id: "audience", label: "Audience" },
  { id: "garden", label: "Garden" },
];

/** Always-visible summary of what the room sees. */
export function AdminStatusBar({ state, loaded }: { state: FestivalState; loaded: boolean }) {
  const { next, view, upcoming } = useCaptionsView(state);
  const inquiry = activeLiveInquiry(state);
  const { audioStatus } = state.appState;
  void loaded;

  return (
    <div className="sticky top-0 z-30 -mx-6 border-b border-festival-ink/10 bg-festival-cream/95 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <StatusPill status={audioStatus} className="text-base" />

        <p className="min-w-0 flex-1 basis-80">
          <span className="text-sm font-semibold uppercase tracking-wide opacity-70">Live inquiry </span>
          {inquiry ? (
            <span className="font-semibold">{inquiry.body}</span>
          ) : (
            <span className="opacity-70">none yet</span>
          )}
          <span className="block text-sm opacity-70" aria-live="polite">
            Screen: {VIEW_LABELS[view]}
            {upcoming && ` · ${VIEW_LABELS[upcoming.view]} in ${upcoming.inSeconds}s`}
            {next && ` · Schedule next: ${next.title}`}
          </span>
        </p>
      </div>

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
