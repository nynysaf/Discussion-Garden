"use client";

import { useState, type FormEvent } from "react";
import { cleanLabel, LABEL_MAX, TIER_NAME } from "@/lib/garden/edit";
import { shortLabel } from "@/lib/garden/labels";
import { TIERS, type Tier } from "@/lib/garden/types";
import type { DraftLink, QueueItem } from "@/lib/synthesis/drafts";
import {
  approveNode,
  approveReinforcement,
  rejectNode,
  rejectReinforcement,
  setVineStatus,
} from "@/lib/synthesis/drafts-db";
import type { HostRun } from "../useHostAction";
import { dangerButton, input, primaryButton, secondaryButton } from "../garden/styles";

type Props = { item: QueueItem; busy: boolean; run: HostRun };

const badge = "rounded-full bg-festival-green/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-festival-forest";

function linkText(link: DraftLink): string {
  const verb =
    link.kind === "relates_to" ? "relates to" : link.outgoing ? "grows into" : "grown from";
  return `${verb} “${link.label}”${link.waiting ? " (also waiting)" : ""}`;
}

function Quotes({ quotes }: { quotes: string[] }) {
  if (quotes.length === 0) return null;
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-semibold text-festival-forest">
        From the talk ({quotes.length})
      </summary>
      <ul className="mt-1 flex flex-col gap-1 border-l-2 border-festival-green pl-3">
        {quotes.map((q, i) => (
          <li key={i} className="opacity-80">
            “{q}”
          </li>
        ))}
      </ul>
    </details>
  );
}

function Rationale({ text }: { text: string | null }) {
  return text ? <p className="mt-1 text-sm opacity-80">{text}</p> : null;
}

function NodeDraft({ item, busy, run }: Props & { item: Extract<QueueItem, { type: "node" }> }) {
  const { node } = item;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(node.label);
  const [tier, setTier] = useState<Tier>(node.tier);
  const [labelError, setLabelError] = useState<string | null>(null);
  const tvLabel = shortLabel(label);

  async function approveEdited(event: FormEvent) {
    event.preventDefault();
    const clean = cleanLabel(label);
    if (!clean) {
      setLabelError(`Give the idea a short name (up to ${LABEL_MAX} characters).`);
      return;
    }
    setLabelError(null);
    await run((s) => approveNode(s, node.id, { label: clean, tier }));
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className={badge}>New {TIER_NAME[node.tier].toLowerCase()}</span>
            <span className="font-semibold">{node.label}</span>
          </p>
          <Rationale text={node.rationale} />
          {item.links.length > 0 && (
            <ul className="mt-1 text-sm opacity-70">
              {item.links.map((link, i) => (
                <li key={i}>↳ {linkText(link)}</li>
              ))}
            </ul>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" className={primaryButton} disabled={busy} onClick={() => void run((s) => approveNode(s, node.id))}>
              Approve
            </button>
            <button type="button" className={secondaryButton} disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className={dangerButton} disabled={busy} onClick={() => void run((s) => rejectNode(s, node.id))}>
              Reject
            </button>
          </div>
        )}
      </div>

      {editing && (
        <form onSubmit={approveEdited} className="mt-3 grid gap-3 md:grid-cols-[1fr_10rem_auto_auto] md:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Name</span>
            <input className={input} maxLength={LABEL_MAX} value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Tier</span>
            <select className={input} value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
              {[...TIERS].reverse().map((t) => (
                <option key={t} value={t}>
                  {TIER_NAME[t]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={primaryButton} disabled={busy}>
            Approve with changes
          </button>
          <button
            type="button"
            className={secondaryButton}
            disabled={busy}
            onClick={() => {
              setEditing(false);
              setLabel(node.label);
              setTier(node.tier);
              setLabelError(null);
            }}
          >
            Cancel
          </button>
          {tvLabel !== label.trim() && label.trim() && (
            <span className="text-sm opacity-70 md:col-span-4">The TV will show: “{tvLabel}”</span>
          )}
          {labelError && (
            <span className="text-sm font-semibold text-festival-terracotta md:col-span-4" role="alert">
              {labelError}
            </span>
          )}
        </form>
      )}
      <Quotes quotes={item.quotes} />
    </>
  );
}

export function DraftCard({ item, busy, run }: Props) {
  return (
    <li className="rounded-2xl bg-festival-cream px-4 py-3">
      {item.type === "node" && <NodeDraft item={item} busy={busy} run={run} />}

      {item.type === "vine" && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-0">
            <span className={badge}>New vine</span>{" "}
            <span className="font-semibold">“{item.sourceLabel}”</span>{" "}
            {item.vine.kind === "grows_into" ? "grows into" : "relates to"}{" "}
            <span className="font-semibold">“{item.targetLabel}”</span>
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" className={primaryButton} disabled={busy} onClick={() => void run((s) => setVineStatus(s, item.id, "published"))}>
              Approve
            </button>
            <button type="button" className={dangerButton} disabled={busy} onClick={() => void run((s) => setVineStatus(s, item.id, "rejected"))}>
              Reject
            </button>
          </div>
        </div>
      )}

      {item.type === "reinforce" && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className={badge}>
                  Mentioned again{item.ids.length > 1 ? ` ×${item.ids.length}` : ""}
                </span>
                <span className="font-semibold">{item.label}</span>
              </p>
              <Rationale text={item.rationale} />
              <p className="mt-1 text-sm opacity-70">
                Approving makes this idea {item.ids.length > 1 ? `${item.ids.length} sizes` : "one size"} bigger.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className={primaryButton}
                disabled={busy}
                onClick={() => void run(async (s) => { for (const id of item.ids) await approveReinforcement(s, id); })}
              >
                Approve
              </button>
              <button
                type="button"
                className={dangerButton}
                disabled={busy}
                onClick={() => void run(async (s) => { for (const id of item.ids) await rejectReinforcement(s, id); })}
              >
                Reject
              </button>
            </div>
          </div>
          <Quotes quotes={item.quotes} />
        </>
      )}
    </li>
  );
}
