"use client";

import { useRef, useState } from "react";
import { BODY_MAX, NAME_TAG_MAX } from "@/lib/submissions/limits";

const field =
  "w-full rounded-xl border border-festival-ink/25 bg-festival-cream px-3 py-3 text-base";

type Phase = "editing" | "sending" | "sent";

export function AudienceForm() {
  const [body, setBody] = useState("");
  const [nameTag, setNameTag] = useState("");
  const [phase, setPhase] = useState<Phase>("editing");
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError("Write something first.");
      return;
    }
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, nameTag }),
      });
      if (res.ok) {
        setBody("");
        setPhase("sent");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Couldn't send right now. Please try again in a moment.");
      setPhase("editing");
    } catch {
      setError("No connection. Check your Wi-Fi and try again.");
      setPhase("editing");
    }
  }

  function sendAnother() {
    setPhase("editing");
    requestAnimationFrame(() => bodyRef.current?.focus());
  }

  if (phase === "sent") {
    return (
      <section className="mt-8 flex flex-col items-center text-center" aria-live="polite">
        <Sprout />
        <h2 className="mt-4 font-display text-3xl font-semibold">Sent — thank you!</h2>
        <p className="mt-2 opacity-80">
          A host will read it. If it&apos;s approved, it may appear on the screen upstairs.
        </p>
        <button
          type="button"
          onClick={sendAnother}
          className="mt-6 min-h-11 rounded-full bg-festival-forest px-6 py-3 font-semibold text-festival-cream transition hover:brightness-110"
        >
          Send another
        </button>
      </section>
    );
  }

  const remaining = BODY_MAX - body.length;

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">Your question, story, or reaction</span>
        <textarea
          ref={bodyRef}
          className={`${field} min-h-36`}
          rows={5}
          maxLength={BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-describedby="body-count"
        />
        <span id="body-count" className="self-end text-sm opacity-70">
          {remaining} characters left
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">
          Name or tag <span className="font-normal opacity-70">(optional)</span>
        </span>
        <input
          className={field}
          type="text"
          maxLength={NAME_TAG_MAX}
          autoComplete="off"
          placeholder="e.g. a curious neighbour"
          value={nameTag}
          onChange={(e) => setNameTag(e.target.value)}
        />
      </label>

      <p className="text-sm opacity-80">
        A host reviews every message before it appears on a screen. Please don&apos;t include
        phone numbers, emails, or other personal details.
      </p>

      <button
        type="submit"
        disabled={phase === "sending"}
        className="min-h-11 rounded-full bg-festival-forest px-6 py-3 text-lg font-semibold text-festival-cream transition hover:brightness-110 disabled:opacity-40"
      >
        {phase === "sending" ? "Sending…" : "Send"}
      </button>

      {error && (
        <p className="rounded-xl bg-festival-terracotta/15 px-4 py-3" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function Sprout() {
  return (
    <svg viewBox="0 0 64 64" className="h-20 w-20" aria-hidden="true">
      <path d="M8 56h48" className="stroke-festival-forest" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 56V30" className="stroke-festival-forest" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 34C32 22 24 14 12 14c0 12 8 20 20 20Z" className="fill-festival-green stroke-festival-forest" strokeWidth="2" />
      <path d="M32 30c0-10 7-17 18-17 0 10-7 17-18 17Z" className="fill-festival-green stroke-festival-forest" strokeWidth="2" />
    </svg>
  );
}
