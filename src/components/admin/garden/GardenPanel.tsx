"use client";

import { useState } from "react";
import { GardenCanvas } from "@/components/garden/GardenCanvas";
import { useGarden } from "@/components/realtime/useGarden";
import { byTier, connectionsOf, searchNodes, TIER_NAME } from "@/lib/garden/edit";
import { plantNode, setGardenHidden } from "@/lib/garden/garden-edit-db";
import type { AppState } from "@/lib/realtime/app-state";
import { TIERS } from "@/lib/garden/types";
import { useHostAction } from "../useHostAction";
import { NodeEditor } from "./NodeEditor";
import { PlantForm } from "./PlantForm";
import { input } from "./styles";

type Props = { appState: AppState; stateLoaded: boolean };

export function GardenPanel({ appState, stateLoaded }: Props) {
  const { garden, loaded, error: loadError } = useGarden();
  const { busy, error, run } = useHostAction();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const hidden = appState.gardenHidden;
  const sessionId = appState.activeSessionId;
  const matches = searchNodes(garden.nodes, query);

  function toggleHidden() {
    if (!hidden && !window.confirm("Hide the garden on every TV? Captions keep running.")) return;
    void run((s) => setGardenHidden(s, !hidden));
  }

  return (
    <section className="rounded-3xl bg-white/60 p-6 shadow-poster">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-3xl font-semibold">Garden</h2>
        <button
          type="button"
          role="switch"
          aria-checked={!hidden}
          disabled={!stateLoaded || busy}
          onClick={toggleHidden}
          className={`rounded-full px-4 py-1.5 font-semibold transition disabled:opacity-40 ${
            hidden
              ? "bg-festival-terracotta/20 text-festival-ink hover:bg-festival-terracotta/30"
              : "bg-festival-forest text-festival-cream hover:brightness-110"
          }`}
        >
          {hidden ? "Hidden on TVs — tap to show" : "Showing on TVs — tap to hide"}
        </button>
      </div>
      <p className="mt-2 text-sm opacity-70">
        One garden for the whole festival. Everything you plant here appears on the TVs straight away
        {sessionId ? "" : " (pick a festival day above so new ideas record which day they came from)"}.
      </p>

      {(error ?? loadError) && (
        <p className="mt-3 rounded-xl bg-festival-terracotta/15 px-4 py-2" role="alert">
          {error ?? `Can't load the garden: ${loadError}`}
        </p>
      )}

      <div className="relative mt-4 h-80 overflow-hidden rounded-2xl border-2 border-festival-green bg-festival-cream">
        <GardenCanvas garden={garden} className="h-full w-full" />
        {hidden && (
          <span className="absolute left-3 top-3 rounded-full bg-festival-terracotta/20 px-3 py-1 text-sm font-semibold">
            Hidden on TVs
          </span>
        )}
      </div>

      <div className="mt-4">
        <PlantForm
          garden={garden}
          disabled={!loaded || busy}
          onPlant={(value) => run((s) => plantNode(s, { ...value, sessionId }))}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">
          Ideas {loaded && <span className="font-normal opacity-70">({garden.nodes.length})</span>}
        </h3>
        <input
          type="search"
          className={`${input} w-full md:w-72`}
          placeholder="Find an idea…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Find an idea"
        />
      </div>

      {loaded && garden.nodes.length === 0 && (
        <p className="mt-3 opacity-70">Nothing planted yet — start with a seed above.</p>
      )}

      <div className="mt-3 flex max-h-[36rem] flex-col gap-4 overflow-y-auto pr-1">
        {[...TIERS].reverse().map((tier) => {
          const nodes = byTier(matches, tier);
          if (nodes.length === 0) return null;
          return (
            <div key={tier}>
              <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide opacity-70">
                {TIER_NAME[tier]}s ({nodes.length})
              </h4>
              <ul className="flex flex-col gap-1">
                {nodes.map((node) => {
                  const open = openId === node.id;
                  const links = connectionsOf(garden, node.id).length;
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenId(open ? null : node.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                          open ? "bg-festival-forest/10" : "bg-festival-cream hover:bg-festival-forest/5"
                        }`}
                      >
                        <span className="min-w-0 truncate font-semibold">{node.label}</span>
                        <span className="shrink-0 text-sm opacity-70">
                          {node.weight > 1 && `size ${node.weight} · `}
                          {links} vine{links === 1 ? "" : "s"}
                        </span>
                      </button>
                      {open && (
                        <NodeEditor
                          key={`${node.id}:${node.updatedAt}`}
                          node={node}
                          garden={garden}
                          sessionId={sessionId}
                          busy={busy}
                          run={run}
                          onClose={() => setOpenId(null)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
