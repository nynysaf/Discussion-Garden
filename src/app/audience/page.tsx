import type { Metadata } from "next";
import { AudienceForm } from "@/components/audience/AudienceForm";

export const metadata: Metadata = { title: "Share a thought" };

export default function AudiencePage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <h1 className="font-display text-4xl font-bold uppercase tracking-[0.05em]">
        Discussion Garden
      </h1>
      <p className="mt-2 text-lg">
        Share a question or reflection with the discussion upstairs. No login needed.
      </p>
      <AudienceForm />
    </main>
  );
}
