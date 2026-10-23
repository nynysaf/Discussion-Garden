import { describe, expect, it } from "vitest";
import { adjacencyFromVines, islandNodeIds, neighborhoodIds } from "./neighborhood";

describe("neighborhood", () => {
  const vines = [
    { id: "1", sourceId: "a", targetId: "b", kind: "grows_into" as const },
    { id: "2", sourceId: "b", targetId: "c", kind: "relates_to" as const },
    { id: "3", sourceId: "c", targetId: "d", kind: "relates_to" as const },
  ];

  it("includes second-degree neighbors", () => {
    const adj = adjacencyFromVines(vines);
    const n = neighborhoodIds(adj, "a", 2);
    expect(n.has("a")).toBe(true);
    expect(n.has("b")).toBe(true);
    expect(n.has("c")).toBe(true);
    expect(n.has("d")).toBe(false);
  });

  it("marks nodes outside the largest web as islands", () => {
    const islands = islandNodeIds(["a", "b", "c", "d", "lonely"], vines);
    expect(islands.has("lonely")).toBe(true);
    expect(islands.has("a")).toBe(false);
    expect(islandNodeIds(["a", "b", "c", "d"], vines).size).toBe(0);
  });
});
