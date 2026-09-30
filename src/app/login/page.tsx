import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const metadata: Metadata = { title: "Host sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const notHost = params.error === "not-host";

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-white/60 p-8 shadow-poster">
        <p className="text-sm font-semibold uppercase tracking-widest text-festival-forest">
          Discussion Garden
        </p>
        <h1 className="mt-1 font-display text-4xl font-semibold">Host sign in</h1>
        <LoginForm nextPath={next} notHost={notHost} />
      </div>
    </main>
  );
}
