import type { Metadata } from "next";
import { CaptionsLabScreen } from "@/components/captions/CaptionsLabScreen";

export const metadata: Metadata = { title: "Captions lab" };

/** Offline layout sandbox — does not affect the live downstairs TV. */
export default function CaptionsLabPage() {
  return <CaptionsLabScreen />;
}
