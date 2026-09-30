import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Share a thought" };

export default function AudiencePage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-12">
      <h1 className="font-display text-4xl font-bold uppercase tracking-[0.05em]">
        Discussion Garden
      </h1>
      <ComingSoon className="mt-8" title="Share a question or reflection" phase="Phase 4">
        No login needed. Submissions are reviewed before appearing on screens.
      </ComingSoon>
    </main>
  );
}
