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
import { adjacencyFromVines, neighborhoodIds, vineInFocus } from "@/lib/garden/neighborhood";
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

/** Larger world + stronger forces → less overlap. */
const WORLD = { width: 3200, height: 2400 };
const SCALE = 1.05;
const PAN_ARM_PX = 4;
const FADED = 0.12;
const LIT = 1;

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
 * Clara-inspired explore garden: live force, drag-to-pin, topo wallpaper,
 * chrome that doesn't steal pans, hover 2nd-degree focus.
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [brokenSprites, setBrokenSprites] = useState<Set<string>>(() => new Set());
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServer,
  );

  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const viewRef = useRef(view);
  viewRef.current = view;

  const panRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    armed: boolean;
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    id: string;
    moved: boolean;
  } | null>(null);

  const labels = useMemo(() => {
    const ids = labelledNodeIds(garden.nodes, { crowdedAt: 140, recentSeeds: 40 });
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

  const adj = useMemo(() => adjacencyFromVines(garden.vines), [garden.vines]);

  const focusIds = useMemo(() => {
    const root = hoveredId ?? selectedId;
    if (!root) return null;
    return neighborhoodIds(adj, root, 2);
  }, [adj, hoveredId, selectedId]);

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

  // Fit only when the garden topology changes or the box first gets a size — not on every zoom.
  const fittedKey = useRef("");
  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const key = `${topologyKey}|${size.width}x${size.height}`;
    // Re-fit when topology changes; when only size changes (e.g. fullscreen), fit once per size bucket.
    const topoOnly = topologyKey;
    if (fittedKey.current.startsWith(topoOnly) && fittedKey.current !== key) {
      // size change after we already fitted this topology — refit for fullscreen
      fittedKey.current = key;
      setView(fitView(WORLD.width, WORLD.height, size.width, size.height, 48));
      return;
    }
    if (fittedKey.current === key) return;
    fittedKey.current = key;
    setView(fitView(WORLD.width, WORLD.height, size.width, size.height, 48));
  }, [topologyKey, size.width, size.height]);

  useEffect(() => {
    const prevById = new Map(nodesRef.current.map((n) => [n.id, n]));
    const simNodes: SimNode[] = garden.nodes.map((node, i) => {
      const r = nodeRadius(node.tier, node.weight, SCALE);
      const prev = prevById.get(node.id);
      if (prev) {
        return { ...prev, tier: node.tier, label: node.label, weight: node.weight, r };
      }
      const angle = i * 2.399963;
      const dist = 80 + (i % 20) * 36;
      return {
        id: node.id,
        tier: node.tier,
        label: node.label,
        weight: node.weight,
        r,
        x: WORLD.width / 2 + Math.cos(angle) * dist,
        y: TIER_BAND[node.tier] * WORLD.height + Math.sin(angle) * dist * 0.45,
        fx: null,
        fy: null,
        vx: 0,
        vy: 0,
      };
    });

    const idSet = new Set(simNodes.map((n) => n.id));
    const links = garden.vines
      .filter((v) => idSet.has(v.sourceId) && idSet.has(v.targetId))
      .map((v) => ({ source: v.sourceId, target: v.targetId, kind: v.kind }));

    const sim = forceSimulation(simNodes)
      .force(
        "link",
        forceLink<(typeof simNodes)[number], (typeof links)[number]>(links)
          .id((d) => d.id)
          .distance((l) => (l.kind === "grows_into" ? 200 : 260))
          .strength(0.16),
      )
      .force("charge", forceManyBody<SimNode>().strength(-420).distanceMax(900))
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius((d) => d.r + 36)
          .strength(0.95)
          .iterations(2),
      )
      .force("band", forceY<SimNode>((d) => TIER_BAND[d.tier] * WORLD.height).strength(0.04))
      .force("centre", forceX<SimNode>(WORLD.width / 2).strength(0.008))
      .alpha(prevById.size > 0 ? 0.4 : 1)
      .alphaDecay(0.018);

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

  // Draw selected / hovered last so they sit on top.
  const drawOrder = useMemo(() => {
    const list = [...nodes];
    list.sort((a, b) => {
      const score = (id: string) =>
        (id === selectedId ? 2 : 0) + (id === hoveredId ? 1 : 0);
      return score(a.id) - score(b.id);
    });
    return list;
  }, [nodes, selectedId, hoveredId, tick]);

  function clientToLocal(clientX: number, clientY: number) {
    const box = boxRef.current;
    if (!box) return { x: 0, y: 0 };
    const rect = box.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function screenToWorld(screenX: number, screenY: number) {
    const v = viewRef.current;
    return {
      x: (screenX - v.x) / v.k,
      y: (screenY - v.y) / v.k,
    };
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const intensity = Math.min(Math.abs(e.deltaY), 100) / 100;
    const step = 0.008 + intensity * 0.01;
    const factor = e.deltaY > 0 ? 1 - step : 1 + step;
    const pt = clientToLocal(e.clientX, e.clientY);
    setView((current) => zoomAroundPoint(current, pt.x, pt.y, current.k * factor));
  }

  function zoomBy(factor: number) {
    setView((current) => {
      const cx = size.width / 2;
      const cy = size.height / 2;
      return zoomAroundPoint(current, cx, cy, current.k * factor);
    });
  }

  function fitToWorld() {
    if (size.width <= 0 || size.height <= 0) return;
    setView(fitView(WORLD.width, WORLD.height, size.width, size.height, 48));
  }

  function isChrome(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest("[data-garden-chrome]"));
  }

  function onViewportPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    if (isChrome(e.target)) return;
    if ((e.target as Element).closest?.("[data-garden-hit]")) return;
    panRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      armed: false,
    };
    boxRef.current?.setPointerCapture(e.pointerId);
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
    setView((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
  }

  function onViewportPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (node && drag.moved) {
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
      <div
        data-garden-chrome
        className="absolute right-3 top-3 z-20 flex gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ChromeButton label="Zoom in" onClick={() => zoomBy(1.25)}>
          +
        </ChromeButton>
        <ChromeButton label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
          −
        </ChromeButton>
        <ChromeButton label="Fit garden" onClick={fitToWorld}>
          Fit
        </ChromeButton>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-sm text-xs font-semibold text-festival-forest/70">
        Scroll zoom · drag paper to pan · drag a plant to pin · hover to see connections ·
        double-click to release
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
          className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
        >
          <rect width={size.width} height={size.height} fill={PLANT_PALETTE.base} />

          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <MapWallpaper
              theme="plant"
              viewportWidth={WORLD.width}
              viewportHeight={WORLD.height}
              seed="discussion-garden-explore"
              reducedMotion={reducedMotion}
            />

            <g fill="none" strokeLinecap="round" pointerEvents="none">
              {garden.vines.map((vine) => {
                const a = nodes.find((n) => n.id === vine.sourceId);
                const b = nodes.find((n) => n.id === vine.targetId);
                if (!a || !b || a.x == null || b.x == null) return null;
                const lit = vineInFocus(vine.sourceId, vine.targetId, focusIds);
                const grows = vine.kind === "grows_into";
                return (
                  <path
                    key={vine.id}
                    d={curvedPath(a.x, a.y!, b.x, b.y!, vine.id)}
                    stroke={PLANT_PALETTE.edgeStroke}
                    strokeOpacity={(lit ? PLANT_PALETTE.edgeOpacity : FADED * 0.5) * (grows ? 1 : 0.85)}
                    strokeWidth={grows ? 2 : 1.5}
                    strokeDasharray={reducedMotion ? undefined : "4 6"}
                  />
                );
              })}
            </g>

            {drawOrder.map((node) => {
              const sprite = spriteUrl(node.tier, node.id);
              const spriteSize = node.r * 2.3;
              const fontSize = labelFontSize(node.tier, SCALE);
              const lines = labels.get(node.id);
              const selected = selectedId === node.id;
              const hovered = hoveredId === node.id;
              const pinned = node.fx != null;
              const lit = !focusIds || focusIds.has(node.id);
              const opacity = lit ? LIT : FADED;
              return (
                <g
                  key={node.id}
                  data-garden-node={node.id}
                  opacity={opacity}
                  style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                  className="transition-opacity duration-150"
                >
                  {/* Hit target: sprite circle only — labels do not capture clicks */}
                  <circle
                    data-garden-hit={node.id}
                    r={node.r + 6}
                    fill="transparent"
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`${node.label}${pinned ? " (pinned)" : ""}`}
                    onPointerDown={(e) => startNodeDrag(e, node.id)}
                    onPointerEnter={() => setHoveredId(node.id)}
                    onPointerLeave={() =>
                      setHoveredId((h) => (h === node.id ? null : h))
                    }
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
                  />
                  {(selected || hovered) && (
                    <circle
                      r={node.r + 8}
                      className="pointer-events-none fill-none stroke-festival-forest"
                      strokeWidth={2.5}
                    />
                  )}
                  {pinned && (
                    <circle
                      r={node.r + 4}
                      className="pointer-events-none fill-none stroke-festival-denim"
                      strokeWidth={1.5}
                      strokeDasharray="3 4"
                      opacity={0.7}
                    />
                  )}
                  {brokenSprites.has(sprite) ? (
                    <circle
                      r={node.r}
                      className={`pointer-events-none ${FALLBACK_FILL[node.tier]} stroke-festival-ink`}
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
                      className="pointer-events-none"
                      onError={() => setBrokenSprites((s) => new Set(s).add(sprite))}
                    />
                  )}
                  {lines && (
                    <text
                      y={node.r + fontSize * 1.05}
                      textAnchor="middle"
                      className="pointer-events-none font-caption"
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

function ChromeButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="rounded-full border border-festival-forest bg-white/95 px-3 py-1.5 text-sm font-semibold text-festival-forest shadow-poster hover:bg-white"
    >
      {children}
    </button>
  );
}
