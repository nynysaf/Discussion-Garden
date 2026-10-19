import type { Metadata } from "next";
import { FestivalConcluded } from "@/components/archive/FestivalConcluded";
import { isFestivalLive } from "@/lib/festival-live";
import { RoomFeedScreen } from "@/components/room-feed/RoomFeedScreen";

export const metadata: Metadata = { title: "Room feed" };

export default function RoomFeedPage() {
  if (!isFestivalLive()) {
    return <FestivalConcluded formerRole="upstairs room-feed TV" />;
  }
  return <RoomFeedScreen />;
}
