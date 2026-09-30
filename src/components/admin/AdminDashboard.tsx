"use client";

import { ComingSoon } from "@/components/ComingSoon";
import { useFestivalState } from "@/components/realtime/useFestivalState";
import { AudioPanel } from "./AudioPanel";
import { FestivalPanel } from "./FestivalPanel";

export function AdminDashboard() {
  const festival = useFestivalState();

  return (
    <div className="mt-8 flex flex-col gap-6">
      {festival.error && (
        <p className="rounded-xl bg-festival-terracotta/15 px-4 py-2" role="alert">
          Can&apos;t load festival state: {festival.error}
        </p>
      )}
      <AudioPanel appState={festival.state.appState} stateLoaded={festival.loaded} />
      <FestivalPanel state={festival.state} loaded={festival.loaded} />

      <div className="grid gap-6 md:grid-cols-2">
        <ComingSoon title="Schedule editor" phase="Phase 3" />
        <ComingSoon title="Audience moderation" phase="Phase 4" />
        <ComingSoon title="Garden editor" phase="Phase 5" />
        <ComingSoon title="AI drafts" phase="Phase 6" />
      </div>
    </div>
  );
}
