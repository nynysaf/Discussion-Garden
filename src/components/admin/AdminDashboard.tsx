"use client";

import { useFestivalState } from "@/components/realtime/useFestivalState";
import { AdminBoard } from "./AdminBoard";
import { AdminStatusBar } from "./AdminStatusBar";
import { useSyncCalendarSession } from "./useSyncCalendarSession";
import { errorNotice } from "./ui";

export function AdminDashboard() {
  const festival = useFestivalState();
  const { state, loaded } = festival;
  useSyncCalendarSession(state, loaded);

  return (
    <>
      <AdminStatusBar state={state} loaded={loaded} />
      {festival.error && (
        <p className={`mt-4 ${errorNotice}`} role="alert">
          Can&apos;t load festival state: {festival.error}
        </p>
      )}
      <AdminBoard state={state} loaded={loaded} />
    </>
  );
}
