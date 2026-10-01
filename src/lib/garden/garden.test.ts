import { describe, expect, it } from "vitest";
import { labelledNodeIds, shortLabel, wrapLabel } from "./labels";
import { gardenScale, labelFontSize, layoutGarden, nodeRadius, toPositions, type PlacedNode } from "./layout";
import { SPRITE_POOL_SIZE, spriteUrl, stableIndex } from "./sprites";
import type { GardenNode, GardenVine, Tier } from "./types";

function node(id: string, tier: Tier, minute = 0, weight = 1): GardenNode {
  const at = `2026-10-17T15:${String(minute % 60).padStart(2, "0")}:00Z`;
  return { id, tier, label: `Made-up ${tier} ${id}`, weight, originSessionId: null, createdAt: at, updatedAt: at };
}

/** A made-up garden: each sprout gathers a few seeds, each theme a few sprouts. */
function fakeGarden(themes: number, sproutsPerTheme: number, seedsPerSprout: number) {
  const nodes: GardenNode[] = [];
  const vines: GardenVine[] = [];
  let minute = 0;
  for (let t = 0; t < themes; t++) {
    const themeId = `t${t}`;
    nodes.push(node(themeId, "theme", minute++));
    for (let s = 0; s < sproutsPerTheme; s++) {
      const sproutId = `${themeId}s${s}`;
      nodes.push(node(sproutId, "sprout", minute++, 1 + (s % 4)));
      vines.push({ id: `v-${sproutId}`, sourceId: sproutId, targetId: themeId, kind: "grows_into" });
      for (let d = 0; d < seedsPerSprout; d++) {
        const seedId = `${sproutId}d${d}`;
        nodes.push(node(seedId, "seed", minute++));
        vines.push({ id: `v-${seedId}`, sourceId: seedId, targetId: sproutId, kind: "grows_into" });
      }
    }
  }
  return { nodes, vines };
}

const W = 1000;
const H = 700;

function meanY(placed: Map<string, PlacedNode>, nodes: GardenNode[], tier: Tier) {
  const ys = nodes.filter((n) => n.tier === tier).map((n) => placed.get(n.id)!.y);
  return ys.reduce((a, b) => a + b, 0) / ys.length;
}

describe("sprites", () => {
  it("gives a node the same sprite every time, within its tier's pool", () => {
    expect(spriteUrl("theme", "abc")).toBe(spriteUrl("theme", "abc"));
    expect(spriteUrl("seed", "abc")).toMatch(/^\/garden-sprites\/seed\/icon_\d{2}\.png$/);
    for (const tier of ["seed", "sprout", "theme"] as Tier[]) {
      expect(stableIndex(`node-${tier}`, SPRITE_POOL_SIZE[tier])).toBeLessThan(SPRITE_POOL_SIZE[tier]);
    }
  });
});

describe("shortLabel", () => {
  it("keeps short labels as they are", () => {
    expect(shortLabel("  Shared tool libraries ")).toBe("Shared tool libraries");
  });

  it("cuts to six words with an ellipsis", () => {
    expect(shortLabel("one two three four five six seven")).toBe("one two three four five six…");
  });

  it("cuts long words at a word boundary under the character limit", () => {
    expect(shortLabel("Neighbourhood infrastructure maintenance responsibilities")).toBe(
      "Neighbourhood infrastructure…",
    );
  });
});

describe("wrapLabel", () => {
  it("keeps short labels on one line", () => {
    expect(wrapLabel("Know your block")).toEqual(["Know your block"]);
  });

  it("splits longer labels into two balanced lines", () => {
    expect(wrapLabel("Book exchange by the rail trail")).toEqual(["Book exchange by", "the rail trail"]);
  });
});

describe("labelledNodeIds", () => {
  it("labels everything in a small garden", () => {
    const { nodes } = fakeGarden(1, 2, 2);
    expect(labelledNodeIds(nodes).size).toBe(nodes.length);
  });

  it("in a crowded garden keeps all theme/sprout labels but only recent seeds", () => {
    const { nodes } = fakeGarden(3, 4, 5); // 3 + 12 + 60 = 75 nodes
    const ids = labelledNodeIds(nodes, { crowdedAt: 60, recentSeeds: 10 });
    const seeds = nodes.filter((n) => n.tier === "seed" && ids.has(n.id));
    expect(seeds).toHaveLength(10);
    expect(nodes.filter((n) => n.tier !== "seed").every((n) => ids.has(n.id))).toBe(true);
    const newestSeed = [...nodes].filter((n) => n.tier === "seed").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    expect(ids.has(newestSeed.id)).toBe(true);
  });
});

describe("sizing", () => {
  it("grows sprouts with weight, up to a cap", () => {
    expect(nodeRadius("sprout", 3, 1)).toBeGreaterThan(nodeRadius("sprout", 1, 1));
    expect(nodeRadius("sprout", 100, 1)).toBe(nodeRadius("sprout", 50, 1));
    expect(nodeRadius("theme", 1, 1)).toBeGreaterThan(nodeRadius("seed", 1, 1));
  });

  it("shrinks nodes in a crowded garden", () => {
    expect(gardenScale(W, H, 150)).toBeLessThan(gardenScale(W, H, 15));
  });
});

describe("layoutGarden", () => {
  it("returns nothing for an empty garden or canvas", () => {
    expect(layoutGarden({ nodes: [], vines: [], width: W, height: H }).size).toBe(0);
    expect(layoutGarden({ nodes: [node("a", "seed")], vines: [], width: 0, height: H }).size).toBe(0);
  });

  it("puts themes high, sprouts in the middle, seeds low", () => {
    const g = fakeGarden(2, 3, 2); // 2 + 6 + 12 = 20 nodes
    const placed = layoutGarden({ ...g, width: W, height: H });
    expect(meanY(placed, g.nodes, "theme")).toBeLessThan(meanY(placed, g.nodes, "sprout"));
    expect(meanY(placed, g.nodes, "sprout")).toBeLessThan(meanY(placed, g.nodes, "seed"));
  });

  it("keeps every node fully on the canvas", () => {
    const g = fakeGarden(2, 3, 2);
    for (const p of layoutGarden({ ...g, width: W, height: H }).values()) {
      expect(p.x - p.r).toBeGreaterThanOrEqual(0);
      expect(p.x + p.r).toBeLessThanOrEqual(W);
      expect(p.y - p.r).toBeGreaterThanOrEqual(0);
      expect(p.y + p.r).toBeLessThanOrEqual(H);
    }
  });

  it("doesn't overlap nodes in a 15-node garden", () => {
    const g = fakeGarden(1, 2, 6);
    expect(g.nodes).toHaveLength(15);
    const placed = [...layoutGarden({ ...g, width: W, height: H }).values()];
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan((a.r + b.r) * 0.95);
      }
    }
  });

  it("keeps labels from overlapping in a 15-node garden", () => {
    const g = fakeGarden(1, 2, 6);
    g.nodes.forEach((n, i) => (n.label = `Soup night at the community centre ${i}`));
    const labels = new Map(g.nodes.map((n) => [n.id, wrapLabel(n.label)]));
    const placed = layoutGarden({ ...g, width: W, height: H, labels });
    const scale = gardenScale(W, H, g.nodes.length);
    const boxes = g.nodes.map((n) => {
      const p = placed.get(n.id)!;
      const font = labelFontSize(n.tier, scale);
      const lines = labels.get(n.id)!;
      const half = Math.max(p.r, (Math.max(...lines.map((l) => l.length)) * font * 0.56) / 2);
      return { left: p.x - half, right: p.x + half, top: p.y - p.r, bottom: p.y + p.r + lines.length * font * 1.15 };
    });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        expect(apart).toBe(true);
      }
    }
  });

  it("gives the same layout every time (every TV agrees)", () => {
    const g = fakeGarden(2, 3, 2);
    const a = layoutGarden({ ...g, width: W, height: H });
    const b = layoutGarden({ ...g, width: W, height: H });
    expect([...a.values()]).toEqual([...b.values()]);
  });

  it("barely moves existing nodes when one new seed is planted", () => {
    const g = fakeGarden(2, 3, 2);
    const first = layoutGarden({ ...g, width: W, height: H });
    const previous = toPositions(first, W, H);
    const nodes = [...g.nodes, node("new-seed", "seed", 59)];
    const vines = [...g.vines, { id: "v-new", sourceId: "new-seed", targetId: "t0s0", kind: "grows_into" as const }];
    const second = layoutGarden({ nodes, vines, width: W, height: H, previous });

    const moves = g.nodes.map((n) => {
      const a = first.get(n.id)!;
      const b = second.get(n.id)!;
      return Math.hypot(a.x - b.x, a.y - b.y);
    });
    const average = moves.reduce((s, m) => s + m, 0) / moves.length;
    expect(average).toBeLessThan(25);
    expect(second.has("new-seed")).toBe(true);
  });

  it("lays out a full two-day garden (~150 nodes) quickly and on-canvas", () => {
    const g = fakeGarden(6, 4, 5); // 6 + 24 + 120 = 150
    expect(g.nodes).toHaveLength(150);
    const started = performance.now();
    const placed = layoutGarden({ ...g, width: 1100, height: 750 });
    expect(performance.now() - started).toBeLessThan(1500);
    expect(placed.size).toBe(150);
    expect(meanY(placed, g.nodes, "theme")).toBeLessThan(meanY(placed, g.nodes, "seed"));
  });
});
