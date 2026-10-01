"use client";

import { useState, type FormEvent } from "react";
import { byTier, cleanLabel, LABEL_MAX, parentTier, TIER_NAME } from "@/lib/garden/edit";
import { shortLabel } from "@/lib/garden/labels";
import { TIERS, type Garden, type Tier } from "@/lib/garden/types";
import { input, primaryButton } from "./styles";

const TIER_HINT: Record<Tier, string> = {
  seed: "a specific example or story",
  sprout: "a concept several seeds share",
  theme: "a big idea uniting sprouts",
};

type Planted = { tier: Tier; label: string; growsIntoId: string | null };

export function PlantForm({
  garden,
  disabled,
  onPlant,
}: {
  garden: Garden;
  disabled: boolean;
  onPlant: (value: Planted) => Promise<boolean>;
}) {
  const [label, setLabel] = useState("");
  const [tier, setTier] = useState<Tier>("seed");
  const [growsInto, setGrowsInto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parent = parentTier(tier);
  const parents = parent ? byTier(garden.nodes, parent) : [];
  const onTv = shortLabel(label);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = cleanLabel(label);
    if (!clean) {
      setError(`Give the idea a short name (up to ${LABEL_MAX} characters).`);
      return;
    }
    setError(null);
    const growsIntoId = parents.some((p) => p.id === growsInto) ? growsInto : null;
    // Keep tier and "grows into" so several seeds can be planted under one sprout quickly.
    if (await onPlant({ tier, label: clean, growsIntoId })) setLabel("");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-festival-cream p-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 text-sm font-semibold">Plant a…</legend>
        {[...TIERS].reverse().map((t) => (
          <label
            key={t}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-festival-denim ${
              tier === t
                ? "border-festival-forest bg-festival-forest text-festival-cream"
                : "border-festival-ink/20 hover:bg-festival-forest/10"
            }`}
          >
            <input
              type="radio"
              name="plant-tier"
              value={t}
              checked={tier === t}
              onChange={() => {
                setTier(t);
                setGrowsInto("");
              }}
              className="sr-only"
            />
            <span className="font-semibold">{TIER_NAME[t]}</span> — {TIER_HINT[t]}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Short name</span>
          <input
            className={input}
            maxLength={LABEL_MAX}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Tool library on Elm Street"
          />
          {onTv !== label.trim() && label.trim() && (
            <span className="text-sm opacity-70">The TV will show: “{onTv}”</span>
          )}
        </label>
        {parent && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Grows into (optional)</span>
            <select className={input} value={growsInto} onChange={(e) => setGrowsInto(e.target.value)}>
              <option value="">— no {TIER_NAME[parent].toLowerCase()} yet —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className={primaryButton} disabled={disabled}>
          Plant {TIER_NAME[tier].toLowerCase()}
        </button>
        {error && (
          <span className="text-sm font-semibold text-festival-terracotta" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
