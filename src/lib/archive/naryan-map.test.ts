import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { islandNodeIds } from "@/lib/garden/neighborhood";
import aiBridges from "@/data/archive/ai-island-bridges.json";
import aiMapJson from "@/data/archive/ai-sensemaking-map.json";
import type { ArchiveThemeMap } from "./types";
import { applyLabelBridges, parseNaryanMap, type LabelBridge } from "./naryan-map";

const SAMPLE = `
# Test Map
caption: Hello
image: /x.png
imageIntro: Intro line

## Alpha
tier: theme
weight: 6
essay: First sentence.
Still the essay.
quotes: day_1-s0007, day_1-s0045
grows_into: Beta

## Beta
tier: sprout
essay: Child
relates_to: Alpha
`;

describe("parseNaryanMap", () => {
  it("reads title, caption, image, plants, and vines from headings", () => {
    const map = parseNaryanMap(SAMPLE);
    expect(map.title).toBe("Test Map");
    expect(map.caption).toBe("Hello");
    expect(map.image).toBe("/x.png");
    expect(map.imageIntro).toBe("Intro line");
    expect(map.nodes).toHaveLength(2);
    expect(map.nodes[0]?.label).toBe("Alpha");
    expect(map.nodes[0]?.tier).toBe("theme");
    expect(map.nodes[0]?.essay).toContain("First sentence");
    expect(map.nodes[0]?.essay).toContain("Still the essay");
    expect(map.nodes[0]?.quoteIds).toEqual(["day_1-s0007", "day_1-s0045"]);
    expect(map.vines.some((v) => v.kind === "grows_into")).toBe(true);
    expect(map.vines.some((v) => v.kind === "relates_to")).toBe(true);
  });

  it("parses the real naryan-map.md without orphans", () => {
    const source = readFileSync("src/data/archive/naryan-map.md", "utf8");
    const map = parseNaryanMap(source);
    expect(map.nodes.length).toBeGreaterThan(10);
    expect(map.vines.length).toBeGreaterThan(10);
    const ids = new Set(map.nodes.map((n) => n.id));
    for (const v of map.vines) {
      expect(ids.has(v.sourceId)).toBe(true);
      expect(ids.has(v.targetId)).toBe(true);
    }
    expect(map.nodes.some((n) => n.label === "Meta-conversation")).toBe(true);
    expect(map.image).toMatch(/naryan-miro/);
    expect(islandNodeIds(map.nodes.map((n) => n.id), map.vines).size).toBe(0);
  });
});

describe("applyLabelBridges", () => {
  it("adds a vine when both labels exist", () => {
    const map = parseNaryanMap(`${SAMPLE}
## Gamma
tier: seed
essay: Extra
`);
    const next = applyLabelBridges(map, [
      { from: "Alpha", to: "Gamma", kind: "relates_to" },
      { from: "Missing", to: "Beta", kind: "relates_to" },
    ]);
    expect(next.vines.length).toBe(map.vines.length + 1);
  });

  it("joins obvious AI-map islands by matching labels", () => {
    const ai = aiMapJson as ArchiveThemeMap;
    const before = islandNodeIds(
      ai.nodes.map((n) => n.id),
      ai.vines,
    );
    const next = applyLabelBridges(ai, aiBridges as LabelBridge[]);
    const after = islandNodeIds(
      next.nodes.map((n) => n.id),
      next.vines,
    );
    expect(before.size).toBeGreaterThan(0);
    expect(after.size).toBeLessThan(before.size);
  });
});
