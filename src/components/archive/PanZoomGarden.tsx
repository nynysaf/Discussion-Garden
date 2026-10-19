"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { curvedPath } from "@/lib/garden/curves";
import { labelledNodeIds, wrapLabel } from "@/lib/garden/labels";
import {
  EXPLORE_WORLD,
  labelFontSize,
  layoutExploreGarden,
} from "@/lib/garden/layout";
import { spriteUrl } from "@/lib/garden/sprites";
import type { Garden, Tier } from "@/lib/garden/types";
import {
  fitView,
  type ViewTransform,
  zoomAroundPoint,
} from "@/lib/garden/view-transform";

const LABEL_WEIGHT: Record<Tier, number> = { theme: 700, sprout: 600, seed: 600 };
const FALLBACK_FILL: Record<Tier, string> = {
  theme: "fill-festival-marigold",
  sprout: "fill-festival-green",
  seed: "fill-festival-terracotta",
};

const WORLD_W = EXPLORE_WORLD.width;
const WORLD_H = EXPLORE_WORLD.height;
const PAN_ARM_PX = 4;

type Props = {
  garden: Garden;
  selectedId?: string | null;
  onSelectNode?: (id: string) => void;
  className?: string;
};

/**
 * Portfolio garden: large world layout + Clara-style pan (drag) and zoom (wheel / buttons).
 */
export function PanZoomGarden({
  garden,
  selectedId = null,
  onSelectNode,
  className = "",
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [brokenSprites, setBrokenSprites] = useState<Set<string>>(() => new Set());
  const panRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    armed: boolean;
    moved: boolean;
  } | null>(null);
  const gardenKey = garden.nodes.map((n) => n.id).join(",") + "|" + garden.vines.length;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const labels = useMemo(() => {
    const ids = labelledNodeIds(garden.nodes);
    return new Map(
      garden.nodes.filter((n) => ids.has(n.id)).map((n) => [n.id, wrapLabel(n.label)]),
    );
  }, [garden.nodes]);

  const placed = useMemo(
    () =>
      layoutExploreGarden({
        nodes: garden.nodes,
        vines: garden.vines,
        labels,
        width: WORLD_W,
        height: WORLD_H,
      }),
    [garden.nodes, garden.vines, labels],
  );

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    setView(fitView(WORLD_W, WORLD_H, size.width, size.height, 48));
  }, [gardenKey, size.width, size.height]);

  const scale = 1.15;
  const themes = garden.nodes.filter((n) => n.tier === "theme").map((n) => n.label);

  function clientToLocal(clientX: number, clientY: number) {
    const box = boxRef.current;
    if (!box) return { x: 0, y: 0 };
    const rect = box.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const intensity = Math.min(Math.abs(e.deltaY), 100) / 100;
    const step = 0.08 + intensity * 0.12;
    const factor = e.deltaY > 0 ? 1 - step : 1 + step;
    const pt = clientToLocal(e.clientX, e.clientY);
    setView((current) => zoomAroundPoint(current, pt.x, pt.y, current.k * factor));
  }

  function zoomBy(factor: number) {
    setView((current) =>
      zoomAroundPoint(current, size.width / 2, size.height / 2, current.k * factor),
    );
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest("[data-garden-node]")) return;
    panRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      armed: false,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    const dx = e.clientX - pan.lastX;
    const dy = e.clientY - pan.lastY;
    pan.lastX = e.clientX;
    pan.lastY = e.clientY;
    if (!pan.armed) {
      if (Math.hypot(dx, dy) < PAN_ARM_PX) return;
      pan.armed = true;
    }
    pan.moved = true;
    setView((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (panRef.current?.pointerId === e.pointerId) panRef.current = null;
  }

  return (
    <div
      ref={boxRef}
      className={`relative touch-none overflow-hidden bg-festival-cream/40 ${className}`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomBy(1.2)}
          className="rounded-full border border-festival-forest bg-white/90 px-3 py-1.5 text-sm font-semibold text-festival-forest shadow-poster"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomBy(1 / 1.2)}
          className="rounded-full border border-festival-forest bg-white/90 px-3 py-1.5 text-sm font-semibold text-festival-forest shadow-poster"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset view"
          onClick={() => setView(fitView(WORLD_W, WORLD_H, size.width, size.height, 48))}
          className="rounded-full border border-festival-forest bg-white/90 px-3 py-1.5 text-sm font-semibold text-festival-forest shadow-poster"
        >
          Fit
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 z-10 text-xs font-semibold text-festival-forest/70">
        Scroll to zoom · drag empty space to pan
      </p>

      {size.width > 0 && (
        <svg
          width={size.width}
          height={size.height}
          role="img"
          aria-label={
            garden.nodes.length === 0
              ? "The garden is empty"
              : `Garden with ${garden.nodes.length} ideas${themes.length ? `. Themes: ${themes.join(", ")}` : ""}`
          }
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          <defs>
            <linearGradient id="explore-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-festival-marigold)", stopOpacity: 0.12 }} />
              <stop offset="1" style={{ stopColor: "var(--color-festival-green)", stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="explore-soil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-festival-terracotta)", stopOpacity: 0 }} />
              <stop offset="1" style={{ stopColor: "var(--color-festival-terracotta)", stopOpacity: 0.16 }} />
            </linearGradient>
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <rect x="0" y="0" width={WORLD_W} height={WORLD_H * 0.4} fill="url(#explore-sky)" />
            <rect
              x="0"
              y={WORLD_H * 0.55}
              width={WORLD_W}
              height={WORLD_H * 0.45}
              fill="url(#explore-soil)"
            />
            <rect
              x="0"
              y="0"
              width={WORLD_W}
              height={WORLD_H}
              fill="none"
              stroke="var(--color-festival-green)"
              strokeWidth={2}
              opacity={0.35}
            />

            <g fill="none" strokeLinecap="round">
              {garden.vines.map((vine) => {
                const a = placed.get(vine.sourceId);
                const b = placed.get(vine.targetId);
                if (!a || !b) return null;
                const grows = vine.kind === "grows_into";
                return (
                  <path
                    key={vine.id}
                    d={curvedPath(a.x, a.y, b.x, b.y, vine.id)}
                    className={grows ? "stroke-festival-forest" : "stroke-festival-denim"}
                    strokeWidth={grows ? 2.5 : 2}
                    strokeDasharray={grows ? undefined : "4 8"}
                    opacity={grows ? 0.7 : 0.8}
                  />
                );
              })}
            </g>

            {garden.nodes.map((node) => {
              const p = placed.get(node.id);
              if (!p) return null;
              const sprite = spriteUrl(node.tier, node.id);
              const spriteSize = p.r * 2.3;
              const fontSize = labelFontSize(node.tier, scale);
              const lines = labels.get(node.id);
              const selected = selectedId === node.id;
              return (
                <g
                  key={node.id}
                  data-garden-node={node.id}
                  className="cursor-pointer"
                  style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={node.label}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (panRef.current?.moved) return;
                    onSelectNode?.(node.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectNode?.(node.id);
                    }
                  }}
                >
                  {selected && (
                    <circle
                      r={p.r + 8}
                      className="fill-none stroke-festival-forest"
                      strokeWidth={2.5}
                    />
                  )}
                  {brokenSprites.has(sprite) ? (
                    <circle
                      r={p.r}
                      className={`${FALLBACK_FILL[node.tier]} stroke-festival-ink`}
                      strokeWidth={1}
                    />
                  ) : (
                    <image
                      href={sprite}
                      x={-spriteSize / 2}
                      y={-spriteSize / 2}
                      width={spriteSize}
                      height={spriteSize}
                      preserveAspectRatio="xMidYMid meet"
                      onError={() => setBrokenSprites((s) => new Set(s).add(sprite))}
                    />
                  )}
                  {lines && (
                    <text
                      y={p.r + fontSize * 1.05}
                      textAnchor="middle"
                      className="fill-festival-ink stroke-festival-cream font-caption"
                      style={{
                        fontSize,
                        fontWeight: LABEL_WEIGHT[node.tier],
                        paintOrder: "stroke",
                        strokeWidth: 5,
                        strokeLinejoin: "round",
                      }}
                    >
                      {lines.map((line, i) => (
                        <tspan key={i} x={0} dy={i === 0 ? 0 : "1.15em"}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}
