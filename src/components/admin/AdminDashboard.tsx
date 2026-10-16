"use client";

import { useFestivalState } from "@/components/realtime/useFestivalState";
import { AdminStatusBar } from "./AdminStatusBar";
import { AudiencePanel } from "./AudiencePanel";
import { AudioPanel } from "./AudioPanel";
import { DraftsPanel } from "./drafts/DraftsPanel";
import { FestivalPanel } from "./FestivalPanel";
import { GardenPanel } from "./garden/GardenPanel";
import { LiveInquiryPanel } from "./LiveInquiryPanel";
import { ScheduleManager } from "./ScheduleManager";
import { TvScreenPanel } from "./TvScreenPanel";
import { errorNotice } from "./ui";

export function AdminDashboard() {
  const festival = useFestivalState();
  const { state, loaded } = festival;
  const day = state.sessions.find((s) => s.id === state.appState.activeSessionId);

  return (
    <>
      <AdminStatusBar state={state} loaded={loaded} />
      {festival.error && (
        <p className={`mt-4 ${errorNotice}`} role="alert">
          Can&apos;t load festival state: {festival.error}
        </p>
      )}
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <AudioPanel
            appState={state.appState}
            stateLoaded={loaded}
            daySlug={day?.slug ?? null}
          />
          <TvScreenPanel state={state} loaded={loaded} />
          <FestivalPanel state={state} loaded={loaded} />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <ScheduleManager state={state} loaded={loaded} />
            <LiveInquiryPanel state={state} loaded={loaded} />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <DraftsPanel appState={state.appState} stateLoaded={loaded} />
          <AudiencePanel appState={state.appState} stateLoaded={loaded} />
        </div>
        <div className="xl:col-span-2">
          <GardenPanel appState={state.appState} stateLoaded={loaded} />
        </div>
      </div>
    </>
  );
}
