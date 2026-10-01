import { describe, expect, it } from "vitest";
import {
  byTier,
  cleanLabel,
  connectionsOf,
  defaultVineKind,
  LABEL_MAX,
  parentTier,
  searchNodes,
  vineExists,
} from "./edit";
import type { Garden, GardenNode, Tier } from "./types";

function node(id: string, tier: Tier, label: string): GardenNode {
  const at = "2026-10-17T15:00:00Z";
  return { id, tier, label, weight: 1, originSessionId: null, createdAt: at, updatedAt: at };
}

const garden: Garden = {
  nodes: [
    node("t", "theme", "Neighbours as infrastructure"),
    node("s1", "sprout", "Lending beats buying"),
    node("s2", "sprout", "know your block"),
    node("d", "seed", "Tool library on Elm Street"),
  ],
  vines: [
    { id: "v1", sourceId: "s1", targetId: "t", kind: "grows_into" },
    { id: "v2", sourceId: "d", targetId: "s1", kind: "grows_into" },
    { id: "v3", sourceId: "s2", targetId: "s1", kind: "relates_to" },
    { id: "v4", sourceId: "d", targetId: "missing", kind: "relates_to" },
  ],
};

describe("garden edit helpers", () => {
  it("knows which tier each grows into", () => {
    expect(parentTier("seed")).toBe("sprout");
    expect(parentTier("sprout")).toBe("theme");
    expect(parentTier("theme")).toBeNull();
  });

  it("cleans labels and rejects empty or over-long ones", () => {
    expect(cleanLabel("  Shared   tool  libraries ")).toBe("Shared tool libraries");
    expect(cleanLabel("   ")).toBeNull();
    expect(cleanLabel("x".repeat(LABEL_MAX + 1))).toBeNull();
    expect(cleanLabel("x".repeat(LABEL_MAX))).toHaveLength(LABEL_MAX);
  });

  it("defaults to 'grows into' only for the next tier up", () => {
    expect(defaultVineKind("seed", "sprout")).toBe("grows_into");
    expect(defaultVineKind("sprout", "theme")).toBe("grows_into");
    expect(defaultVineKind("seed", "theme")).toBe("relates_to");
    expect(defaultVineKind("sprout", "sprout")).toBe("relates_to");
    expect(defaultVineKind("theme", "seed")).toBe("relates_to");
  });

  it("spots an existing vine in either direction", () => {
    expect(vineExists(garden.vines, "s1", "t")).toBe(true);
    expect(vineExists(garden.vines, "t", "s1")).toBe(true);
    expect(vineExists(garden.vines, "d", "t")).toBe(false);
  });

  it("lists a node's connections, skipping vines to missing nodes", () => {
    const links = connectionsOf(garden, "s1");
    expect(links.map((c) => [c.other.id, c.outgoing])).toEqual([
      ["t", true],
      ["d", false],
      ["s2", false],
    ]);
    expect(connectionsOf(garden, "d").map((c) => c.other.id)).toEqual(["s1"]);
  });

  it("searches labels case-insensitively", () => {
    expect(searchNodes(garden.nodes, "BLOCK").map((n) => n.id)).toEqual(["s2"]);
    expect(searchNodes(garden.nodes, "  ")).toHaveLength(4);
  });

  it("sorts a tier A → Z regardless of case", () => {
    expect(byTier(garden.nodes, "sprout").map((n) => n.id)).toEqual(["s2", "s1"]);
  });
});
