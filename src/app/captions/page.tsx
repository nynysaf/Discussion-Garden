import type { Metadata } from "next";
import { FestivalConcluded } from "@/components/archive/FestivalConcluded";
import { isFestivalLive } from "@/lib/festival-live";
import { CaptionsScreen } from "@/components/captions/CaptionsScreen";

export const metadata: Metadata = { title: "Captions" };

export default function CaptionsPage() {
  if (!isFestivalLive()) {
    return <FestivalConcluded formerRole="downstairs captions & garden TV" />;
  }
  return <CaptionsScreen />;
}
