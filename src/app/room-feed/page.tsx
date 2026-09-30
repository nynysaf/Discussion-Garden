import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Room feed" };

export default function RoomFeedPage() {
  return (
    <main className="flex h-dvh flex-col gap-[3vh] p-[3vh_3vw]">
      <h1 className="font-display text-[clamp(2rem,3.4vw,4.5rem)] font-bold uppercase tracking-[0.05em]">
        Discussion Garden
      </h1>
      <ComingSoon className="flex-1" title="Audience questions & reflections" phase="Phase 4">
        Host-approved submissions will scroll here, with the one being discussed pinned.
      </ComingSoon>
    </main>
  );
}
