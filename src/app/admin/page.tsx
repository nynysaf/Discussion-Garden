import type { Metadata } from "next";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { requireHost } from "@/lib/auth/host";

export const metadata: Metadata = { title: "Host controls" };

export default async function AdminPage() {
  const email = await requireHost("/admin");

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-5xl font-bold uppercase tracking-[0.05em]">
          Host controls
        </h1>
        <nav className="flex items-baseline gap-4 text-sm">
          <span className="opacity-70">{email}</span>
          <SignOutButton />
          <Link href="/" className="text-festival-forest underline">
            All screens
          </Link>
        </nav>
      </header>
      <AdminDashboard />
    </main>
  );
}
