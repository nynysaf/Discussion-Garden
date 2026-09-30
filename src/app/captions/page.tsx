import type { Metadata } from "next";
import { CaptionsScreen } from "@/components/captions/CaptionsScreen";

export const metadata: Metadata = { title: "Captions" };

export default function CaptionsPage() {
  return <CaptionsScreen />;
}
