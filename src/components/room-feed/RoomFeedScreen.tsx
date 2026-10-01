"use client";

import { useRef } from "react";
import { LiveQuestion } from "@/components/realtime/LiveQuestion";
import { useFestivalState } from "@/components/realtime/useFestivalState";
import { useSubmissions } from "@/components/realtime/useSubmissions";
import { StatusPill } from "@/components/StatusPill";
import { activeScheduleItem } from "@/lib/realtime/festival-state";
import { roomFeed, type Submission } from "@/lib/submissions/feed";
import { useAutoScroll } from "./useAutoScroll";

/** Upstairs TV — layout per DESIGN_GUIDE.md §5.3. Read-only. */
export function RoomFeedScreen() {
  const festival = useFestivalState();
  const feed = useSubmissions();
  const { appState } = festival.state;
  const { pinned, others } = roomFeed(feed.submissions, appState.highlightedSubmissionId);
  const offline =
    festival.connection === "reconnecting" || feed.connection === "reconnecting" || !!feed.error;

  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  useAutoScroll(boxRef, listRef, others[0]?.id ?? "");

  return (
    <main className="flex h-dvh flex-col gap-[2.5vh] overflow-hidden p-[3vh_3vw]">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-[clamp(2rem,3.4vw,4.5rem)] font-bold uppercase leading-none tracking-[0.05em]">
          Discussion Garden
        </h1>
        <div className="flex min-w-0 items-center gap-4">
          <LiveQuestion
            item={activeScheduleItem(festival.state)}
            className="text-[clamp(1.1rem,1.8vw,2.4rem)]"
          />
          {offline && (
            <StatusPill status="reconnecting" className="shrink-0 text-[clamp(0.9rem,1vw,1.3rem)]" />
          )}
        </div>
      </header>

      {pinned && <PinnedMessage submission={pinned} />}

      <section aria-label="Audience messages" className="flex min-h-0 flex-1 flex-col">
        {!appState.submissionsOpen && festival.loaded && (
          <p className="mb-[1.5vh] self-start rounded-full bg-festival-ink/10 px-[1em] py-[0.3em] text-[clamp(0.9rem,1.1vw,1.5rem)] font-semibold">
            Sharing is paused
          </p>
        )}
        {feed.loaded && !pinned && others.length === 0 ? (
          <p className="m-auto font-display text-[clamp(1.4rem,2.4vw,3.2rem)] italic opacity-50">
            Questions and reflections from the audience will appear here.
          </p>
        ) : (
          <div ref={boxRef} className="fade-bottom min-h-0 flex-1 overflow-hidden">
            <ol
              ref={listRef}
              className="grid grid-cols-2 items-start gap-[2vh_1.5vw] pb-[6vh] text-[clamp(1.1rem,1.8vw,2.4rem)]"
              aria-live="polite"
              aria-relevant="additions"
            >
              {others.map((s) => (
                <MessageCard key={s.id} submission={s} />
              ))}
            </ol>
          </div>
        )}
      </section>
    </main>
  );
}

function PinnedMessage({ submission }: { submission: Submission }) {
  return (
    <section
      aria-label="Being discussed"
      className="bubble-enter rounded-[2rem] border-4 border-festival-marigold bg-festival-cream px-[2vw] py-[2.5vh] shadow-poster"
    >
      <p className="inline-block rounded-full bg-festival-marigold px-[0.9em] py-[0.25em] text-[clamp(0.9rem,1.2vw,1.6rem)] font-bold uppercase tracking-wider text-festival-ink">
        Being discussed
      </p>
      <p className="mt-[1.5vh] line-clamp-6 whitespace-pre-line break-words text-[clamp(1.4rem,2.4vw,3.2rem)] font-semibold leading-snug">
        {submission.body}
      </p>
      {submission.nameTag && (
        <p className="mt-[1vh] text-[clamp(1rem,1.5vw,2rem)] opacity-70">— {submission.nameTag}</p>
      )}
    </section>
  );
}

function MessageCard({ submission }: { submission: Submission }) {
  return (
    <li className="bubble-enter rounded-3xl border border-festival-ink/10 bg-festival-cream px-[1.2vw] py-[1.8vh] shadow-poster">
      <p className="whitespace-pre-line break-words font-medium leading-snug">{submission.body}</p>
      {submission.nameTag && (
        <p className="mt-[0.6vh] text-[0.75em] opacity-70">— {submission.nameTag}</p>
      )}
    </li>
  );
}
