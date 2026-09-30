"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { nextPath: string; notHost: boolean };

const input =
  "rounded-xl border border-festival-ink/20 bg-festival-cream px-3 py-2";

export function LoginForm({ nextPath, notHost }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    notHost
      ? "That account isn't on the host list. Sign in with a host account."
      : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Couldn't reach the sign-in service. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Email</span>
        <input
          className={input}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Password</span>
        <input
          className={input}
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded-full bg-festival-forest px-5 py-2 font-semibold text-festival-cream transition hover:brightness-110 disabled:opacity-40"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {error && (
        <p className="rounded-xl bg-festival-terracotta/15 px-4 py-2" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
