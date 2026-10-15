"use client";

import { Sprout } from "lucide-react";
import { useState } from "react";
import { GardenCanvas } from "@/components/garden/GardenCanvas";
import { useGarden } from "@/components/realtime/useGarden";
import { byTier, connectionsOf, searchNodes, TIER_NAME } from "@/lib/garden/edit";
import { plantNode, setGardenHidden } from "@/lib/garden/garden-edit-db";
import type { AppState } from "@/lib/realtime/app-state";
import { TIERS } from "@/lib/garden/types";
import { errorNotice, input, Panel, Toggle } from "../ui";
import { useHostAction } from "../useHostAction";
import { NodeEditor } from "./NodeEditor";
import { PlantForm } from "./PlantForm";

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
    <Panel
      id="garden"
      title="Garden"
      icon={Sprout}
      actions={
        <Toggle
          on={!hidden}
          onLabel="Showing on TVs"
          offLabel="Hidden on TVs"
          ariaLabel="Show the garden on the TVs"
          offIsWarning
          disabled={!stateLoaded || busy}
          onClick={toggleHidden}
        />
      }
      description={
        <>
          One garden for the whole festival. Everything you plant here appears on the TVs straight away
          {sessionId ? "" : " (pick a festival day above so new ideas record which day they came from)"}.
        </>
      }
    >
      {(error ?? loadError) && (
        <p className={`mt-3 ${errorNotice}`} role="alert">
          {error ?? `Can't load the garden: ${loadError}`}
        </p>
      )}

      <div className="grid gap-x-8 @5xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <div className="relative mt-4 h-80 overflow-hidden rounded-2xl border-2 border-festival-green bg-festival-cream @5xl:h-96">
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
        </div>

        <div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 @5xl:mt-4">
            <h3 className="text-xl font-semibold">
              Ideas {loaded && <span className="font-normal opacity-70">({garden.nodes.length})</span>}
            </h3>
            <input
              type="search"
              className={`${input} w-full @md:w-72`}
              placeholder="Find an idea…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Find an idea"
            />
          </div>

          {loaded && garden.nodes.length === 0 && (
            <p className="mt-3 opacity-70">Nothing planted yet — start with a seed.</p>
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
        </div>
      </div>
    </Panel>
  );
}
