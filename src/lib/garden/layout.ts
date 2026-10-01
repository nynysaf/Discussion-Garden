import {
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import { stableIndex } from "./sprites";
import type { GardenNode, GardenVine, Tier } from "./types";

/** Vertical centre of each band, as a fraction of the canvas height (sky → soil). */
export const TIER_BAND: Record<Tier, number> = { theme: 0.2, sprout: 0.5, seed: 0.8 };

/** Positions as fractions of the canvas, so they survive a resize or a layout switch. */
export type NodePosition = { x: number; y: number };
export type PlacedNode = { id: string; x: number; y: number; r: number };

/** Label font size in CSS px at scale 1; the canvas and the layout must agree. */
export const LABEL_SIZE: Record<Tier, number> = { theme: 21, sprout: 18, seed: 15 };
const LINE_HEIGHT = 1.15;
/** Rough average glyph width of the caption font, as a fraction of font size. */
const GLYPH_WIDTH = 0.56;

export function labelFontSize(tier: Tier, scale: number): number {
  return LABEL_SIZE[tier] * Math.max(scale, 0.75);
}

/**
 * A node's footprint: half-width, and how far it reaches above and below its
 * centre (sprite on top, label lines underneath).
 */
type Footprint = { halfWidth: number; up: number; down: number };

type SimNode = SimulationNodeDatum & {
  id: string;
  tier: Tier;
  r: number;
  x: number;
  y: number;
} & Footprint;

function footprint(tier: Tier, r: number, lines: string[] | undefined, scale: number): Footprint {
  const pad = 6 * scale;
  if (!lines?.length) return { halfWidth: r + pad, up: r + pad, down: r + pad };
  const font = labelFontSize(tier, scale);
  const textWidth = Math.max(...lines.map((l) => l.length)) * font * GLYPH_WIDTH;
  return {
    halfWidth: Math.max(r, textWidth / 2) + pad,
    up: r + pad,
    down: r + font * 0.3 + lines.length * font * LINE_HEIGHT + pad,
  };
}

/** Push apart any two nodes whose footprints overlap, along the cheaper axis. */
function separateFootprints(nodes: SimNode[], strength: number) {
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dx = b.x - a.x;
      const overlapX = a.halfWidth + b.halfWidth - Math.abs(dx);
      if (overlapX <= 0) continue;
      const dy = b.y - a.y;
      const overlapY = dy >= 0 ? a.down + b.up - dy : b.down + a.up + dy;
      if (overlapY <= 0) continue;
      if (overlapX < overlapY) {
        const shift = (overlapX / 2) * strength * (dx > 0 || (dx === 0 && i % 2 === 0) ? 1 : -1);
        a.x -= shift;
        b.x += shift;
      } else {
        const shift = (overlapY / 2) * strength * (dy >= 0 ? 1 : -1);
        a.y -= shift;
        b.y += shift;
      }
    }
  }
}

/** Base radius in CSS px for a ~1000×700 panel; scaled by canvas size and crowding. */
const BASE_RADIUS: Record<Tier, { base: number; perWeight: number; max: number }> = {
  seed: { base: 16, perWeight: 1, max: 20 },
  sprout: { base: 24, perWeight: 3, max: 38 },
  theme: { base: 36, perWeight: 2, max: 46 },
};

/** Shrinks nodes on small canvases and in a crowded (two-day) garden. */
export function gardenScale(width: number, height: number, nodeCount: number): number {
  const size = Math.min(1.6, Math.max(0.6, Math.min(width, height) / 700));
  const crowding = Math.min(1, Math.max(0.6, Math.sqrt(40 / Math.max(nodeCount, 1))));
  return size * crowding;
}

export function nodeRadius(tier: Tier, weight: number, scale: number): number {
  const { base, perWeight, max } = BASE_RADIUS[tier];
  return Math.min(max, base + perWeight * Math.max(0, weight - 1)) * scale;
}

/** Small deterministic PRNG so every screen computes the identical garden. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/**
 * Lay out the garden: seeds low, sprouts in the middle, themes high, vines
 * pulling related nodes together, nothing overlapping. Pure and deterministic:
 * run once per change, then the screen animates nodes to these spots and stops.
 * Pass `previous` positions to keep existing nodes (nearly) where they were,
 * and `labels` (wrapped lines per labelled node) so labels don't collide.
 */
export function layoutGarden({
  nodes,
  vines,
  width,
  height,
  previous,
  labels,
}: {
  nodes: GardenNode[];
  vines: GardenVine[];
  width: number;
  height: number;
  previous?: Map<string, NodePosition>;
  labels?: Map<string, string[]>;
}): Map<string, PlacedNode> {
  const placed = new Map<string, PlacedNode>();
  if (nodes.length === 0 || width <= 0 || height <= 0) return placed;

  const scale = gardenScale(width, height, nodes.length);
  const marginX = 12 * scale;
  const ids = new Set(nodes.map((n) => n.id));
  const links = vines
    .filter((v) => ids.has(v.sourceId) && ids.has(v.targetId))
    .map((v) => ({ source: v.sourceId, target: v.targetId, kind: v.kind }));

  const prior = (id: string) => {
    const p = previous?.get(id);
    return p ? { x: p.x * width, y: p.y * height } : null;
  };

  const sim: SimNode[] = nodes.map((node) => {
    const r = nodeRadius(node.tier, node.weight, scale);
    const base = { id: node.id, tier: node.tier, r, ...footprint(node.tier, r, labels?.get(node.id), scale) };
    const known = prior(node.id);
    if (known) return { ...base, ...known };

    const neighbour = links
      .map((l) => (l.source === node.id ? l.target : l.target === node.id ? l.source : null))
      .map((id) => (id ? prior(id) : null))
      .find(Boolean);
    const spread = stableIndex(node.id, 1000) / 1000;
    const bandY = TIER_BAND[node.tier] * height;
    return neighbour
      ? {
          ...base,
          x: neighbour.x + (spread - 0.5) * 80 * scale,
          y: bandY + (spread - 0.5) * 20 * scale,
        }
      : {
          ...base,
          x: marginX + spread * (width - 2 * marginX),
          y: bandY + (stableIndex(`${node.id}:y`, 100) / 100 - 0.5) * 40 * scale,
        };
  });

  const settling = previous && previous.size > 0;
  const simulation = forceSimulation(sim)
    .randomSource(seededRandom(nodes.length * 7919 + links.length))
    .force(
      "link",
      forceLink<SimNode, (typeof links)[number]>(links)
        .id((d) => d.id)
        .distance((l) => (l.kind === "grows_into" ? 0.22 : 0.3) * Math.min(width, height))
        .strength(0.15),
    )
    .force("charge", forceManyBody<SimNode>().strength(-60 * scale))
    .force(
      "band",
      forceY<SimNode>((d) => TIER_BAND[d.tier] * height).strength((d) => (d.tier === "seed" ? 0.15 : 0.3)),
    )
    .force("centre", forceX<SimNode>(width / 2).strength(0.01))
    .alpha(settling ? 0.35 : 1)
    .stop();

  const keepOnCanvas = () => {
    for (const node of sim) {
      node.x = Math.min(width - marginX - node.halfWidth, Math.max(marginX + node.halfWidth, node.x));
      node.y = Math.min(height - 4 - node.down, Math.max(node.up, node.y));
    }
  };

  const ticks = settling ? 120 : 300;
  for (let i = 0; i < ticks; i += 1) {
    simulation.tick();
    separateFootprints(sim, 0.6);
    keepOnCanvas();
  }
  // Final tidy-up with forces off: just untangle whatever still overlaps.
  for (let i = 0; i < 40; i += 1) {
    separateFootprints(sim, 1);
    keepOnCanvas();
  }

  for (const node of sim) placed.set(node.id, { id: node.id, x: node.x, y: node.y, r: node.r });
  return placed;
}

/** Placed nodes → fractions, to feed back in as `previous` next time. */
export function toPositions(
  placed: Map<string, PlacedNode>,
  width: number,
  height: number,
): Map<string, NodePosition> {
  const out = new Map<string, NodePosition>();
  for (const p of placed.values()) out.set(p.id, { x: p.x / width, y: p.y / height });
  return out;
}
