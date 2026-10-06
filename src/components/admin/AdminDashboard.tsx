"use client";

import { useFestivalState } from "@/components/realtime/useFestivalState";
import { AudiencePanel } from "./AudiencePanel";
import { AudioPanel } from "./AudioPanel";
import { DraftsPanel } from "./drafts/DraftsPanel";
import { FestivalPanel } from "./FestivalPanel";
import { GardenPanel } from "./garden/GardenPanel";
import { ScheduleManager } from "./ScheduleManager";

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
      <ScheduleManager state={festival.state} loaded={festival.loaded} />
      <AudiencePanel appState={festival.state.appState} stateLoaded={festival.loaded} />
      <GardenPanel appState={festival.state.appState} stateLoaded={festival.loaded} />
      <DraftsPanel appState={festival.state.appState} stateLoaded={festival.loaded} />
    </div>
  );
}
