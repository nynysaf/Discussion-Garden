import type { Metadata } from "next";
import { FestivalConcluded } from "@/components/archive/FestivalConcluded";
import { isFestivalLive } from "@/lib/festival-live";
import { AudienceForm } from "@/components/audience/AudienceForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Share a thought" };

async function submissionsOpen(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_state").select("submissions_open").maybeSingle();
    return data?.submissions_open !== false;
  } catch {
    return true;
  }
}

export default async function AudiencePage() {
  if (!isFestivalLive()) {
    return <FestivalConcluded formerRole="phone audience form" />;
  }
  const open = await submissionsOpen();
  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <h1 className="font-display text-4xl font-bold uppercase tracking-[0.05em]">
        Discussion Garden
      </h1>
      <p className="mt-2 text-lg">
        Share a question or reflection with the discussion upstairs.
      </p>
      <AudienceForm initiallyOpen={open} />
    </main>
  );
}
