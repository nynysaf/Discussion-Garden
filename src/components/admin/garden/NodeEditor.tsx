"use client";

import { useState, type FormEvent } from "react";
import {
  byTier,
  cleanLabel,
  connectionsOf,
  defaultVineKind,
  LABEL_MAX,
  TIER_NAME,
  vineExists,
} from "@/lib/garden/edit";
import {
  addVine,
  deleteNode,
  deleteVine,
  mergeNodes,
  updateNode,
} from "@/lib/garden/garden-edit-db";
import { TIERS, type Garden, type GardenNode, type Tier, type VineKind } from "@/lib/garden/types";
import type { HostRun } from "../useHostAction";
import { dangerButton, input, primaryButton, secondaryButton } from "./styles";

type Props = {
  node: GardenNode;
  garden: Garden;
  sessionId: string | null;
  busy: boolean;
  run: HostRun;
  onClose: () => void;
};

/** Options for "pick another idea", grouped by tier. */
function NodeOptions({ nodes }: { nodes: GardenNode[] }) {
  return (
    <>
      {[...TIERS].reverse().map((tier) => {
        const group = byTier(nodes, tier);
        return group.length ? (
          <optgroup key={tier} label={`${TIER_NAME[tier]}s`}>
            {group.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </optgroup>
        ) : null;
      })}
    </>
  );
}

export function NodeEditor({ node, garden, sessionId, busy, run, onClose }: Props) {
  const [label, setLabel] = useState(node.label);
  const [tier, setTier] = useState<Tier>(node.tier);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState("");
  const [kind, setKind] = useState<VineKind>("relates_to");
  const [mergeId, setMergeId] = useState("");

  const others = garden.nodes.filter((n) => n.id !== node.id);
  const unconnected = others.filter((n) => !vineExists(garden.vines, node.id, n.id));
  const connections = connectionsOf(garden, node.id);
  const byId = new Map(garden.nodes.map((n) => [n.id, n]));

  async function save(event: FormEvent) {
    event.preventDefault();
    const clean = cleanLabel(label);
    if (!clean) {
      setLabelError(`Give the idea a short name (up to ${LABEL_MAX} characters).`);
      return;
    }
    setLabelError(null);
    await run((s) => updateNode(s, node.id, { label: clean, tier }));
  }

  function pickTarget(id: string) {
    setTargetId(id);
    const target = byId.get(id);
    if (target) setKind(defaultVineKind(node.tier, target.tier));
  }

  async function connect() {
    if (!targetId) return;
    const ok = await run((s) =>
      addVine(s, { sourceId: node.id, targetId, kind, sessionId }),
    );
    if (ok) setTargetId("");
  }

  async function merge() {
    const keep = byId.get(mergeId);
    if (!keep) return;
    const question = `Merge “${node.label}” into “${keep.label}”?\n\n“${node.label}” is removed; its vines and size move to “${keep.label}”. The TVs update right away.`;
    if (!window.confirm(question)) return;
    if (await run((s) => mergeNodes(s, keep.id, node.id))) onClose();
  }

  async function remove() {
    const vines = connections.length ? ` and its ${connections.length} vine${connections.length === 1 ? "" : "s"}` : "";
    if (!window.confirm(`Delete “${node.label}”${vines} from the garden? The TVs update right away.`)) return;
    if (await run((s) => deleteNode(s, node.id))) onClose();
  }

  return (
    <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-festival-forest/30 bg-white/70 p-4">
      <form onSubmit={save} className="grid gap-3 md:grid-cols-[1fr_10rem_auto] md:items-end">
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
        <button
          type="submit"
          className={primaryButton}
          disabled={busy || (label === node.label && tier === node.tier)}
        >
          Save
        </button>
        {labelError && (
          <span className="text-sm font-semibold text-festival-terracotta md:col-span-3" role="alert">
            {labelError}
          </span>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Size {node.weight}</span>
        <button
          type="button"
          className={secondaryButton}
          disabled={busy || node.weight <= 1}
          onClick={() => void run((s) => updateNode(s, node.id, { weight: node.weight - 1 }))}
          aria-label="Make smaller"
        >
          −
        </button>
        <button
          type="button"
          className={secondaryButton}
          disabled={busy}
          onClick={() => void run((s) => updateNode(s, node.id, { weight: node.weight + 1 }))}
        >
          + Mentioned again
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Vines</span>
        {connections.length === 0 && <p className="text-sm opacity-70">Not connected to anything yet.</p>}
        <ul className="flex flex-col gap-1">
          {connections.map(({ vine, other, outgoing }) => (
            <li key={vine.id} className="flex items-center justify-between gap-3 rounded-xl bg-festival-cream px-3 py-1.5">
              <span className="min-w-0 text-sm">
                {vine.kind === "relates_to"
                  ? "relates to "
                  : outgoing
                    ? "grows into "
                    : "grows from "}
                <span className="font-semibold">{other.label}</span>
                <span className="opacity-60"> · {TIER_NAME[other.tier]}</span>
              </span>
              <button
                type="button"
                className={secondaryButton}
                disabled={busy}
                onClick={() => void run((s) => deleteVine(s, vine.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 md:grid-cols-[1fr_10rem_auto] md:items-center">
          <select
            className={input}
            value={targetId}
            onChange={(e) => pickTarget(e.target.value)}
            aria-label="Connect to"
          >
            <option value="">Connect to…</option>
            <NodeOptions nodes={unconnected} />
          </select>
          <select
            className={input}
            value={kind}
            onChange={(e) => setKind(e.target.value as VineKind)}
            aria-label="Kind of vine"
          >
            <option value="grows_into">grows into</option>
            <option value="relates_to">relates to</option>
          </select>
          <button type="button" className={secondaryButton} disabled={busy || !targetId} onClick={() => void connect()}>
            Connect
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-festival-ink/10 pt-3">
        <select
          className={`${input} min-w-0 flex-1`}
          value={mergeId}
          onChange={(e) => setMergeId(e.target.value)}
          aria-label="Merge into"
        >
          <option value="">Duplicate? Merge into…</option>
          <NodeOptions nodes={others} />
        </select>
        <button type="button" className={secondaryButton} disabled={busy || !mergeId} onClick={() => void merge()}>
          Merge
        </button>
        <button type="button" className={dangerButton} disabled={busy} onClick={() => void remove()}>
          Delete
        </button>
        <button type="button" className={secondaryButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
