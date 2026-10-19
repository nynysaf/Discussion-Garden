"use client";

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MapWallpaper } from "@/components/archive/MapWallpaper";
import { curvedPath } from "@/lib/garden/curves";
import { labelledNodeIds, wrapLabel } from "@/lib/garden/labels";
import { labelFontSize, nodeRadius, TIER_BAND } from "@/lib/garden/layout";
import { spriteUrl } from "@/lib/garden/sprites";
import { PLANT_PALETTE } from "@/lib/garden/topo";
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

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function reducedMotionServer() {
  return false;
}

const WORLD = { width: 2400, height: 1800 };
const SCALE = 1.1;
const PAN_ARM_PX = 4;

type SimNode = SimulationNodeDatum & {
  id: string;
  tier: Tier;
  label: string;
  weight: number;
  r: number;
  x: number;
  y: number;
  fx: number | null;
  fy: number | null;
};

type Props = {
  garden: Garden;
  selectedId?: string | null;
  onSelectNode?: (id: string) => void;
  className?: string;
};

/**
 * Clara-inspired explore garden: live force + drag-to-pin + Camp-CLAI topo wallpaper.
 */
export function ForceGarden({
  garden,
  selectedId = null,
  onSelectNode,
  className = "",
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [tick, setTick] = useState(0);
  const [brokenSprites, setBrokenSprites] = useState<Set<string>>(() => new Set());
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServer,
  );

  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const panRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    armed: boolean;
    moved: boolean;
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    id: string;
    moved: boolean;
  } | null>(null);

  const labels = useMemo(() => {
    // Explore can show more labels than the TV; keep seeds when the garden is dense.
    const ids = labelledNodeIds(garden.nodes, { crowdedAt: 140, recentSeeds: 40 });
    // Archive nodes lack updatedAt — fall back to weight for which seeds keep labels.
    if (garden.nodes.length >= 140) {
      const seeds = [...garden.nodes]
        .filter((n) => n.tier === "seed")
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 40);
      for (const s of seeds) ids.add(s.id);
    }
    return new Map(
      garden.nodes.filter((n) => ids.has(n.id)).map((n) => [n.id, wrapLabel(n.label)]),
    );
  }, [garden.nodes]);

  const topologyKey =
    garden.nodes.map((n) => n.id).join(",") +
    "|" +
    garden.vines.map((v) => `${v.sourceId}-${v.targetId}-${v.kind}`).join(",");

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

  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      setView(fitView(WORLD.width, WORLD.height, size.width, size.height, 40));
    }
  }, [topologyKey, size.width, size.height]);

  // Live force simulation (Clara pattern).
  useEffect(() => {
    const prevById = new Map(nodesRef.current.map((n) => [n.id, n]));
    const simNodes: SimNode[] = garden.nodes.map((node, i) => {
      const r = nodeRadius(node.tier, node.weight, SCALE);
      const prev = prevById.get(node.id);
      if (prev) {
        return {
          ...prev,
          tier: node.tier,
          label: node.label,
          weight: node.weight,
          r,
        };
      }
      const angle = i * 2.399963;
      const dist = 40 + (i % 12) * 28;
      return {
        id: node.id,
        tier: node.tier,
        label: node.label,
        weight: node.weight,
        r,
        x: WORLD.width / 2 + Math.cos(angle) * dist,
        y: TIER_BAND[node.tier] * WORLD.height + Math.sin(angle) * dist * 0.4,
        fx: null,
        fy: null,
        vx: 0,
        vy: 0,
      };
    });

    const idSet = new Set(simNodes.map((n) => n.id));
    const links = garden.vines
      .filter((v) => idSet.has(v.sourceId) && idSet.has(v.targetId))
      .map((v) => ({
        source: v.sourceId,
        target: v.targetId,
        kind: v.kind,
      }));

    const sim = forceSimulation(simNodes)
      .force(
        "link",
        forceLink<(typeof simNodes)[number], (typeof links)[number]>(links)
          .id((d) => d.id)
          .distance((l) => (l.kind === "grows_into" ? 130 : 170))
          .strength(0.22),
      )
      .force("charge", forceManyBody<SimNode>().strength(-240))
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius((d) => d.r + 22)
          .strength(0.85),
      )
      .force("band", forceY<SimNode>((d) => TIER_BAND[d.tier] * WORLD.height).strength(0.06))
      .force("centre", forceX<SimNode>(WORLD.width / 2).strength(0.012))
      .alpha(prevById.size > 0 ? 0.35 : 1)
      .alphaDecay(0.022);

    nodesRef.current = simNodes;
    simRef.current = sim;
    sim.on("tick", () => setTick((t) => t + 1));

    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [topologyKey, garden.nodes, garden.vines]);

  const nodes = nodesRef.current;
  void tick;

  function clientToLocal(clientX: number, clientY: number) {
    const box = boxRef.current;
    if (!box) return { x: 0, y: 0 };
    const rect = box.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - view.x) / view.k,
      y: (screenY - view.y) / view.k,
    };
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    // Clara KnowledgeMap wheel curve
    const intensity = Math.min(Math.abs(e.deltaY), 100) / 100;
    const step = 0.008 + intensity * 0.01;
    const factor = e.deltaY > 0 ? 1 - step : 1 + step;
    const pt = clientToLocal(e.clientX, e.clientY);
    setView((current) => zoomAroundPoint(current, pt.x, pt.y, current.k * factor));
  }

  function zoomBy(factor: number) {
    setView((current) =>
      zoomAroundPoint(current, size.width / 2, size.height / 2, current.k * factor),
    );
  }

  function onViewportPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    if ((e.target as Element).closest("[data-garden-node]")) return;
    panRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      armed: false,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onViewportPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const local = clientToLocal(e.clientX, e.clientY);
      const world = screenToWorld(local.x, local.y);
      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (node) {
        node.fx = world.x;
        node.fy = world.y;
        drag.moved = true;
        simRef.current?.alphaTarget(0.22).restart();
        setTick((t) => t + 1);
      }
      return;
    }
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

  function onViewportPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (node && drag.moved) {
        // Stay pinned where released (Clara).
        node.fx = node.x;
        node.fy = node.y;
        simRef.current?.alphaTarget(0).alpha(0.35).restart();
      } else if (node && !drag.moved) {
        onSelectNode?.(node.id);
      }
      dragRef.current = null;
      return;
    }
    if (panRef.current?.pointerId === e.pointerId) panRef.current = null;
  }

  function startNodeDrag(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    if (e.button !== 0) return;
    dragRef.current = { pointerId: e.pointerId, id, moved: false };
    // Capture on the viewport so move/up keep firing (Clara pattern).
    boxRef.current?.setPointerCapture(e.pointerId);
  }

  function unpinNode(id: string) {
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node) return;
    node.fx = null;
    node.fy = null;
    simRef.current?.alpha(0.4).restart();
  }

  const themes = garden.nodes.filter((n) => n.tier === "theme").map((n) => n.label);

  return (
    <div
      ref={boxRef}
      className={`relative touch-none overflow-hidden ${className}`}
      style={{ backgroundColor: PLANT_PALETTE.base }}
      onWheel={onWheel}
      onPointerDown={onViewportPointerDown}
      onPointerMove={onViewportPointerMove}
      onPointerUp={onViewportPointerUp}
      onPointerCancel={onViewportPointerUp}
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
          onClick={() => setView(fitView(WORLD.width, WORLD.height, size.width, size.height, 40))}
          className="rounded-full border border-festival-forest bg-white/90 px-3 py-1.5 text-sm font-semibold text-festival-forest shadow-poster"
        >
          Fit
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-xs text-xs font-semibold text-festival-forest/70">
        Scroll zoom · drag paper to pan · drag a plant to pin · double-click to release
      </p>

      {size.width > 0 && (
        <svg
          width={size.width}
          height={size.height}
          role="img"
          aria-label={
            garden.nodes.length === 0
              ? "The garden is empty"
              : `Garden with ${garden.nodes.length} ideas${themes.length ? `. Themes: ${themes.slice(0, 8).join(", ")}` : ""}`
          }
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          {/* Outer fill — Clara: theme base so letterboxing never flashes white */}
          <rect width={size.width} height={size.height} fill={PLANT_PALETTE.base} />

          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <MapWallpaper
              theme="plant"
              viewportWidth={WORLD.width}
              viewportHeight={WORLD.height}
              seed="discussion-garden-explore"
              reducedMotion={reducedMotion}
            />

            <g fill="none" strokeLinecap="round">
              {garden.vines.map((vine) => {
                const a = nodes.find((n) => n.id === vine.sourceId);
                const b = nodes.find((n) => n.id === vine.targetId);
                if (!a || !b || a.x == null || b.x == null) return null;
                const grows = vine.kind === "grows_into";
                return (
                  <path
                    key={vine.id}
                    d={curvedPath(a.x, a.y!, b.x, b.y!, vine.id)}
                    stroke={PLANT_PALETTE.edgeStroke}
                    strokeOpacity={PLANT_PALETTE.edgeOpacity}
                    strokeWidth={grows ? 2 : 1.5}
                    strokeDasharray={reducedMotion ? undefined : "4 6"}
                  />
                );
              })}
            </g>

            {nodes.map((node) => {
              const sprite = spriteUrl(node.tier, node.id);
              const spriteSize = node.r * 2.3;
              const fontSize = labelFontSize(node.tier, SCALE);
              const lines = labels.get(node.id);
              const selected = selectedId === node.id;
              const pinned = node.fx != null;
              return (
                <g
                  key={node.id}
                  data-garden-node={node.id}
                  className="cursor-pointer"
                  style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`${node.label}${pinned ? " (pinned)" : ""}`}
                  onPointerDown={(e) => startNodeDrag(e, node.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    unpinNode(node.id);
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
                      r={node.r + 8}
                      className="fill-none stroke-festival-forest"
                      strokeWidth={2.5}
                    />
                  )}
                  {pinned && (
                    <circle
                      r={node.r + 4}
                      className="fill-none stroke-festival-denim"
                      strokeWidth={1.5}
                      strokeDasharray="3 4"
                      opacity={0.7}
                    />
                  )}
                  {brokenSprites.has(sprite) ? (
                    <circle
                      r={node.r}
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
                      y={node.r + fontSize * 1.05}
                      textAnchor="middle"
                      className="font-caption"
                      fill={PLANT_PALETTE.labelFill}
                      stroke={PLANT_PALETTE.base}
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
