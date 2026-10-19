"use client";

import { useMemo, useState } from "react";
import { GardenCanvas } from "@/components/garden/GardenCanvas";
import type { ArchiveMapLayer, ArchiveSegment, ArchiveThemeMap } from "@/lib/archive/types";
import { themeMapToGarden } from "@/lib/archive/types";
import type { Garden } from "@/lib/garden/types";

const LAYERS: { id: ArchiveMapLayer; label: string }[] = [
  { id: "live", label: "Festival garden" },
  { id: "ai", label: "AI reading" },
  { id: "host", label: "Host reading" },
];

type Props = {
  liveGarden: Garden;
  liveDescriptions: Record<string, string>;
  aiMap: ArchiveThemeMap;
  hostMap: ArchiveThemeMap;
  segmentsById: Record<string, ArchiveSegment>;
};

function originLabel(id: string | null): string {
  if (!id) return "shared";
  if (id === "day_0" || id === "day_1" || id === "day_2") return id;
  return "festival";
}

export function ExploreGarden({
  liveGarden,
  liveDescriptions,
  aiMap,
  hostMap,
  segmentsById,
}: Props) {
  const [layer, setLayer] = useState<ArchiveMapLayer>("host");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const garden = useMemo(() => {
    if (layer === "live") return liveGarden;
    if (layer === "ai") return themeMapToGarden(aiMap);
    return themeMapToGarden(hostMap);
  }, [layer, liveGarden, aiMap, hostMap]);

  const caption =
    layer === "live"
      ? "Ideas planted live during the festival under host approval (Hybrid / Manual)."
      : layer === "ai"
        ? aiMap.caption
        : hostMap.caption;

  const themeNode =
    layer === "ai"
      ? aiMap.nodes.find((n) => n.id === selectedId)
      : layer === "host"
        ? hostMap.nodes.find((n) => n.id === selectedId)
        : null;

  const liveNode = layer === "live" ? liveGarden.nodes.find((n) => n.id === selectedId) : null;

  const quotes = (themeNode?.quoteIds ?? [])
    .map((id) => segmentsById[id])
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="min-h-[420px] flex-1 rounded-3xl border border-festival-green bg-white/50 shadow-poster lg:min-h-[560px]">
        <GardenCanvas
          garden={garden}
          className="h-full min-h-[420px] w-full lg:min-h-[560px]"
          selectedId={selectedId}
          onSelectNode={setSelectedId}
        />
      </div>

      <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Garden lens">
          {LAYERS.map((item) => {
            const active = layer === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setLayer(item.id);
                  setSelectedId(null);
                }}
                className={
                  active
                    ? "rounded-full bg-festival-forest px-4 py-2 text-sm font-semibold text-festival-cream"
                    : "rounded-full border border-festival-forest/40 px-4 py-2 text-sm font-semibold text-festival-forest"
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm opacity-80">{caption}</p>

        <div className="rounded-3xl border border-festival-green/70 bg-white/70 p-4 shadow-poster">
          {!selectedId && (
            <p className="font-display text-xl italic opacity-70">
              Click a plant to read its story.
            </p>
          )}
          {liveNode && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-festival-forest">
                {liveNode.tier} · {originLabel(liveNode.originSessionId)}
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold">{liveNode.label}</h2>
              <p className="mt-2 text-sm opacity-80">
                {liveDescriptions[liveNode.id] || "Planted during the live festival garden."}
              </p>
            </>
          )}
          {themeNode && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-festival-forest">
                {themeNode.tier}
                {themeNode.originSessionId ? ` · ${themeNode.originSessionId}` : ""}
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold">{themeNode.label}</h2>
              <p className="mt-2 text-sm leading-relaxed opacity-85">{themeNode.essay}</p>
              {quotes.length > 0 && (
                <ul className="mt-4 space-y-3 border-t border-festival-green/50 pt-3">
                  {quotes.map((q) => (
                    <li key={q.id} className="text-sm">
                      <span className="font-semibold text-festival-forest">{q.voice}</span>
                      <span className="opacity-60"> · {q.clock}</span>
                      <p className="mt-0.5 italic opacity-90">“{q.text}”</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
