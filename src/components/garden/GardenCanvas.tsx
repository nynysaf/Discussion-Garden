"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { curvedPath } from "@/lib/garden/curves";
import { labelledNodeIds, wrapLabel } from "@/lib/garden/labels";
import {
  gardenScale,
  labelFontSize,
  layoutGarden,
  toPositions,
  type NodePosition,
} from "@/lib/garden/layout";
import { spriteUrl } from "@/lib/garden/sprites";
import type { Garden, Tier } from "@/lib/garden/types";

const LABEL_WEIGHT: Record<Tier, number> = { theme: 700, sprout: 600, seed: 600 };
const FALLBACK_FILL: Record<Tier, string> = {
  theme: "fill-festival-marigold",
  sprout: "fill-festival-green",
  seed: "fill-festival-terracotta",
};

const NO_NODES: Garden["nodes"] = [];

type Props = { garden: Garden; hidden?: boolean; className?: string };

type LayoutState = {
  nodes: Garden["nodes"] | null;
  vines: Garden["vines"] | null;
  width: number;
  height: number;
  placed: ReturnType<typeof layoutGarden>;
  memory: Map<string, NodePosition>;
};

/** Read-only garden drawing (DESIGN_GUIDE §6). Lays out once per change, then holds still. */
export function GardenCanvas({ garden, hidden = false, className = "" }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // `memory` is the last layout as canvas fractions, so existing nodes stay put when the garden grows.
  const [layout, setLayout] = useState<LayoutState>(() => ({
    nodes: null,
    vines: null,
    width: 0,
    height: 0,
    placed: new Map(),
    memory: new Map(),
  }));
  const [brokenSprites, setBrokenSprites] = useState<Set<string>>(() => new Set());

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

  const nodes = hidden ? NO_NODES : garden.nodes;
  const { width, height } = size;
  const labels = useMemo(() => {
    const ids = labelledNodeIds(nodes);
    return new Map(nodes.filter((n) => ids.has(n.id)).map((n) => [n.id, wrapLabel(n.label)]));
  }, [nodes]);

  // Re-lay out only when the inputs change, seeding from the last layout.
  if (
    layout.nodes !== nodes ||
    layout.vines !== garden.vines ||
    layout.width !== width ||
    layout.height !== height
  ) {
    const next = layoutGarden({ nodes, vines: garden.vines, width, height, previous: layout.memory, labels });
    setLayout({
      nodes,
      vines: garden.vines,
      width,
      height,
      placed: next,
      memory: next.size > 0 ? toPositions(next, width, height) : layout.memory,
    });
  }
  const { placed } = layout;

  const scale = gardenScale(width, height, nodes.length);
  const themes = nodes.filter((n) => n.tier === "theme").map((n) => n.label);

  return (
    <div ref={boxRef} className={`relative overflow-hidden ${className}`}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={
            nodes.length === 0
              ? "The garden is empty"
              : `Garden with ${nodes.length} ideas${themes.length ? `. Themes: ${themes.join(", ")}` : ""}`
          }
          className="absolute inset-0"
        >
          <defs>
            <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-festival-marigold)", stopOpacity: 0.1 }} />
              <stop offset="1" style={{ stopColor: "var(--color-festival-green)", stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="garden-soil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-festival-terracotta)", stopOpacity: 0 }} />
              <stop offset="1" style={{ stopColor: "var(--color-festival-terracotta)", stopOpacity: 0.14 }} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={width} height={height * 0.4} fill="url(#garden-sky)" />
          <rect x="0" y={height * 0.6} width={width} height={height * 0.4} fill="url(#garden-soil)" />

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
                  pathLength={grows ? 1 : undefined}
                  className={grows ? "vine-draw stroke-festival-forest" : "vine-fade stroke-festival-denim"}
                  strokeWidth={(grows ? 2 : 1.5) * Math.max(scale, 0.8)}
                  strokeDasharray={grows ? undefined : `${2 * scale} ${6 * scale}`}
                  opacity={grows ? 0.7 : 0.8}
                />
              );
            })}
          </g>

          {nodes.map((node) => {
            const p = placed.get(node.id);
            if (!p) return null;
            const sprite = spriteUrl(node.tier, node.id);
            const spriteSize = p.r * 2.3;
            const fontSize = labelFontSize(node.tier, scale);
            const lines = labels.get(node.id);
            return (
              <g
                key={node.id}
                className="garden-node"
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
              >
                <g className="garden-grow">
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
                        strokeWidth: 4,
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
              </g>
            );
          })}
        </svg>
      )}
      {width > 0 && nodes.length === 0 && (
        <p className="absolute inset-0 m-auto flex items-center justify-center font-display text-[clamp(1.2rem,2vw,2.5rem)] italic opacity-50">
          {hidden ? "" : "The garden will grow here."}
        </p>
      )}
    </div>
  );
}
