"use client";

import { Maximize2, Minimize2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ForceGarden } from "@/components/archive/ForceGarden";
import type { ArchiveSegment, ArchiveThemeMap } from "@/lib/archive/types";
import { themeMapToGarden } from "@/lib/archive/types";
import { DENSITY_DEFAULT } from "@/lib/garden/density";
import type { Garden } from "@/lib/garden/types";

type ExploreLayer = "live" | "ai";

const LAYERS: { id: ExploreLayer; label: string }[] = [
  { id: "live", label: "Naryan's Map" },
  { id: "ai", label: "AI's Map" },
];

type Props = {
  liveGarden: Garden;
  liveDescriptions: Record<string, string>;
  aiMap: ArchiveThemeMap;
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
  segmentsById,
}: Props) {
  const [layer, setLayer] = useState<ExploreLayer>("ai");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [density, setDensity] = useState(DENSITY_DEFAULT);

  const garden = useMemo(
    () => (layer === "live" ? liveGarden : themeMapToGarden(aiMap)),
    [layer, liveGarden, aiMap],
  );

  const caption =
    layer === "live"
      ? "Ideas planted live during the festival under host approval (Hybrid / Manual)."
      : aiMap.caption;

  const themeNode = layer === "ai" ? aiMap.nodes.find((n) => n.id === selectedId) : null;
  const liveNode = layer === "live" ? liveGarden.nodes.find((n) => n.id === selectedId) : null;

  const quotes = (themeNode?.quoteIds ?? [])
    .map((id) => segmentsById[id])
    .filter(Boolean)
    .slice(0, 4);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const layerTabs = (
    <MapToolbar
      layer={layer}
      density={density}
      onLayerChange={(id) => {
        setLayer(id);
        setSelectedId(null);
      }}
      onDensityChange={setDensity}
    />
  );

  const notes = (
    <NotesPanel
      caption={caption}
      selectedId={selectedId}
      liveNode={liveNode}
      themeNode={themeNode}
      liveDescriptions={liveDescriptions}
      quotes={quotes}
    />
  );

  const gardenPane = (
    <ForceGarden
      garden={garden}
      className="h-full min-h-[280px] w-full"
      selectedId={selectedId}
      onSelectNode={setSelectedId}
      density={density}
    />
  );

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-[var(--color-festival-cream)]"
        role="dialog"
        aria-modal="true"
        aria-label="Garden fullscreen"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-festival-green/50 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <p className="font-display text-xl font-semibold uppercase tracking-[0.04em]">
              Explore the gardens
            </p>
            {layerTabs}
          </div>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="inline-flex items-center gap-2 rounded-full border border-festival-forest bg-white px-4 py-2 text-sm font-semibold text-festival-forest shadow-poster"
          >
            <Minimize2 className="h-4 w-4" aria-hidden />
            Exit fullscreen
            <X className="h-4 w-4 opacity-60" aria-hidden />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative min-h-0 min-w-0 flex-1 select-none">{gardenPane}</div>
          <aside className="max-h-[40vh] w-full overflow-y-auto border-t border-festival-green/40 p-4 lg:max-h-none lg:w-96 lg:border-l lg:border-t-0 lg:p-6">
            {notes}
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {layerTabs}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="relative min-h-[70vh] flex-1 overflow-hidden rounded-3xl border border-festival-forest/30 shadow-poster select-none lg:min-h-[calc(100vh-12rem)]">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="absolute left-3 top-3 z-20 inline-flex select-none items-center gap-2 rounded-full border border-festival-forest bg-white/95 px-3 py-1.5 text-sm font-semibold text-festival-forest shadow-poster hover:bg-white"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
            Fullscreen
          </button>
          <div className="h-full min-h-[70vh] w-full lg:min-h-[calc(100vh-12rem)]">{gardenPane}</div>
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">{notes}</aside>
      </div>
    </div>
  );
}

function MapToolbar({
  layer,
  density,
  onLayerChange,
  onDensityChange,
}: {
  layer: ExploreLayer;
  density: number;
  onLayerChange: (id: ExploreLayer) => void;
  onDensityChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Garden lens">
        {LAYERS.map((item) => {
          const active = layer === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onLayerChange(item.id)}
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
      <label className="flex min-w-[16rem] flex-1 items-center gap-3 sm:max-w-md">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-festival-forest">
          Tighter
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={density}
          onChange={(e) => onDensityChange(Number(e.target.value))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={density}
          aria-valuetext={`${density} percent, ${density < 50 ? "tighter" : density > 50 ? "looser" : "default"}`}
          aria-label="Map density"
          className="h-2 w-full cursor-pointer accent-festival-forest"
        />
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-festival-forest">
          Looser
        </span>
        <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-festival-forest">
          {density}%
        </span>
      </label>
    </div>
  );
}

function NotesPanel({
  caption,
  selectedId,
  liveNode,
  themeNode,
  liveDescriptions,
  quotes,
}: {
  caption: string;
  selectedId: string | null;
  liveNode: Garden["nodes"][number] | null | undefined;
  themeNode: ArchiveThemeMap["nodes"][number] | null | undefined;
  liveDescriptions: Record<string, string>;
  quotes: ArchiveSegment[];
}) {
  return (
    <>
      <p className="text-sm opacity-80">{caption}</p>
      <div className="rounded-3xl border border-festival-green/70 bg-white/70 p-4 shadow-poster">
        {!selectedId && (
          <p className="font-display text-xl italic opacity-70">
            Click a plant to read its story. Hover to see its web of connections.
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
    </>
  );
}
