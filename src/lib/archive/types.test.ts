import { describe, expect, it } from "vitest";
import { themeMapToGarden, type ArchiveThemeMap } from "./types";

describe("themeMapToGarden", () => {
  it("maps theme nodes and vines into Garden shape", () => {
    const map: ArchiveThemeMap = {
      layer: "host",
      title: "Host",
      caption: "test",
      nodes: [
        {
          id: "a",
          tier: "theme",
          label: "Signal",
          weight: 3,
          originSessionId: null,
          essay: "…",
          quoteIds: [],
        },
        {
          id: "b",
          tier: "seed",
          label: "Seed",
          weight: 1,
          originSessionId: "day_1",
          essay: "…",
          quoteIds: [],
        },
      ],
      vines: [{ id: "v1", sourceId: "b", targetId: "a", kind: "grows_into" }],
    };
    const garden = themeMapToGarden(map);
    expect(garden.nodes).toHaveLength(2);
    expect(garden.vines[0]?.kind).toBe("grows_into");
    expect(garden.nodes[0]?.createdAt).toBe("");
  });
});
