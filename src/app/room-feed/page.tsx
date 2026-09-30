import type { Metadata } from "next";
import { RoomFeedScreen } from "@/components/room-feed/RoomFeedScreen";

export const metadata: Metadata = { title: "Room feed" };

export default function RoomFeedPage() {
  return <RoomFeedScreen />;
}
