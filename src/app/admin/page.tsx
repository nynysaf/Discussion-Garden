import type { Metadata } from "next";
import Link from "next/link";
import { AudioPanel } from "@/components/admin/AudioPanel";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Host controls" };

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-5xl font-bold uppercase tracking-[0.05em]">
          Host controls
        </h1>
        <Link href="/" className="text-festival-forest underline">
          All screens
        </Link>
      </header>

      <div className="mt-8 flex flex-col gap-6">
        <AudioPanel />

        <div className="grid gap-6 md:grid-cols-2">
          <ComingSoon title="Schedule & live question" phase="Phase 3" />
          <ComingSoon title="Audience moderation" phase="Phase 4" />
          <ComingSoon title="Garden editor" phase="Phase 5" />
          <ComingSoon title="AI drafts" phase="Phase 6" />
        </div>
      </div>
    </main>
  );
}
