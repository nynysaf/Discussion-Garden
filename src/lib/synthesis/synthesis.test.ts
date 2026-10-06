import { describe, expect, it } from "vitest";
import type { GardenNode, GardenVine, Tier } from "@/lib/garden/types";
import { compactGarden } from "./garden-context";
import { similarLabels } from "./similarity";
import { MAX_NEW_NODES, planFromProposal, type ValidationContext } from "./validate";
import { buildWindow } from "./window";

function node(id: string, tier: Tier, label: string, extra: Partial<GardenNode> = {}): GardenNode {
  const at = "2026-10-17T15:00:00Z";
  return { id, tier, label, weight: 1, originSessionId: null, createdAt: at, updatedAt: at, ...extra };
}

function seg(id: string, text: string, minute: number) {
  return { id, text, createdAt: `2026-10-17T15:${String(minute).padStart(2, "0")}:00Z` };
}

describe("buildWindow", () => {
  it("labels segments s1… in spoken order and reports the time span", () => {
    const w = buildWindow([seg("b", "Second thing.", 2), seg("a", "First thing.", 1)], { minChars: 0 });
    expect(w.text).toBe("[s1] First thing.\n[s2] Second thing.");
    expect(w.refs.get("s1")).toBe("a");
    expect(w.start).toBe("2026-10-17T15:01:00Z");
    expect(w.end).toBe("2026-10-17T15:02:00Z");
  });

  it("keeps the newest segments that fit", () => {
    const w = buildWindow(
      [seg("old", "x".repeat(50), 1), seg("mid", "y".repeat(50), 2), seg("new", "z".repeat(50), 3)],
      { maxChars: 120, minChars: 0 },
    );
    expect(w.segments.map((s) => s.id)).toEqual(["mid", "new"]);
  });

  it("flags a quiet window as not worth a call", () => {
    expect(buildWindow([seg("a", "Hello.", 1)]).substantial).toBe(false);
    expect(buildWindow([]).text).toBe("");
  });
});

describe("similarLabels", () => {
  it("matches the same idea in slightly different words", () => {
    expect(similarLabels("Local currency keeps wealth local", "Local currencies keep wealth local")).toBe(true);
    expect(similarLabels("Tool library!", "tool library")).toBe(true);
  });
  it("keeps different ideas apart", () => {
    expect(similarLabels("Tool library on Elm Street", "Seed swap by the library")).toBe(false);
    expect(similarLabels("Trust", "Trust takes repetition")).toBe(false);
  });
});

describe("compactGarden", () => {
  const nodes = [
    node("s1", "seed", "Old seed", { createdAt: "2026-10-17T11:00:00Z", updatedAt: "2026-10-17T12:00:00Z" }),
    node("t1", "theme", "Neighbours as infrastructure"),
    node("p1", "sprout", "Lending beats buying", { weight: 3 }),
    node("s2", "seed", "New seed", { createdAt: "2026-10-18T11:00:00Z", updatedAt: "2026-10-18T12:00:00Z" }),
  ];
  const vines: GardenVine[] = [{ id: "v", sourceId: "p1", targetId: "t1", kind: "grows_into" }];

  it("lists themes, then sprouts, then seeds with weights and parents", () => {
    const ctx = compactGarden(nodes, vines);
    expect(ctx.text.split("\n")).toEqual([
      "[e1] theme: Neighbours as infrastructure",
      "[e2] sprout: Lending beats buying (mentioned 3×) → grows into e1",
      "[e3] seed: Old seed",
      "[e4] seed: New seed",
    ]);
    expect(ctx.refs.get("e2")).toBe("p1");
  });

  it("past the cap keeps every theme and sprout plus the newest seeds", () => {
    const ctx = compactGarden(nodes, vines, 3);
    expect([...ctx.refs.values()]).toEqual(["t1", "p1", "s2"]);
  });
});

describe("planFromProposal", () => {
  const published = [
    node("t1", "theme", "Neighbours as infrastructure"),
    node("p1", "sprout", "Lending beats buying"),
  ];
  const ctx: ValidationContext = {
    segmentRefs: new Map([
      ["s1", "seg-1"],
      ["s2", "seg-2"],
    ]),
    nodeRefs: new Map([
      ["e1", "t1"],
      ["e2", "p1"],
    ]),
    published,
    publishedVines: [{ id: "v", sourceId: "p1", targetId: "t1", kind: "grows_into" }],
    blocked: [
      { label: "Seed swap at the library", status: "draft" },
      { label: "Ban all cars downtown", status: "rejected" },
    ],
  };
  const newNode = (key: string, tier: Tier, label: string, refs = ["s1"]) => ({
    key,
    tier,
    label,
    rationale: "why",
    segment_refs: refs,
  });

  it("accepts grounded ideas and maps transcript refs to segment ids", () => {
    const plan = planFromProposal(
      {
        new_nodes: [newNode("n1", "seed", "Tool library on Elm Street", ["s1", "s2", "s9"])],
        reinforce: [],
        new_vines: [{ source: "n1", target: "e2", kind: "grows_into", rationale: "" }],
      },
      ctx,
    );
    expect(plan.nodes).toEqual([
      { key: "n1", tier: "seed", label: "Tool library on Elm Street", rationale: "why", segmentIds: ["seg-1", "seg-2"] },
    ]);
    expect(plan.vines).toEqual([
      { source: { kind: "new", key: "n1" }, target: { kind: "existing", id: "p1" }, kind: "grows_into" },
    ]);
    expect(plan.dropped).toEqual([]);
  });

  it("drops ungrounded seeds, long labels, and blocked ideas", () => {
    const plan = planFromProposal(
      {
        new_nodes: [
          newNode("n1", "seed", "Invented example", []),
          newNode("n2", "sprout", "This label is far too long to fit"),
          newNode("n3", "seed", "Seed swap at the library"),
          newNode("n4", "sprout", "Ban all cars downtown"),
        ],
        reinforce: [],
        new_vines: [],
      },
      ctx,
    );
    expect(plan.nodes).toEqual([]);
    expect(plan.dropped.map((d) => d.reason)).toEqual([
      "seed not grounded in the transcript",
      "longer than 6 words",
      "already waiting for review",
      "a host rejected this before",
    ]);
  });

  it("turns a near-duplicate of a published idea into “mentioned again” and keeps its vines", () => {
    const plan = planFromProposal(
      {
        new_nodes: [
          newNode("n1", "sprout", "Lending beat buying"),
          newNode("n2", "seed", "Tool library on Elm Street"),
        ],
        reinforce: [{ ref: "e2", rationale: "again", segment_refs: ["s2"] }],
        new_vines: [{ source: "n2", target: "n1", kind: "grows_into", rationale: "" }],
      },
      ctx,
    );
    expect(plan.nodes.map((n) => n.key)).toEqual(["n2"]);
    expect(plan.reinforce).toEqual([{ nodeId: "p1", rationale: "why", segmentIds: ["seg-1", "seg-2"] }]);
    expect(plan.vines[0].target).toEqual({ kind: "existing", id: "p1" });
  });

  it("fixes vine direction and kind, and drops bad or repeated vines", () => {
    const plan = planFromProposal(
      {
        new_nodes: [newNode("n1", "seed", "Repair café at the library")],
        reinforce: [{ ref: "e9", rationale: "", segment_refs: [] }],
        new_vines: [
          { source: "e2", target: "n1", kind: "grows_into", rationale: "" },
          { source: "n1", target: "e2", kind: "relates_to", rationale: "" },
          { source: "n1", target: "e1", kind: "grows_into", rationale: "" },
          { source: "e2", target: "e1", kind: "relates_to", rationale: "" },
          { source: "n1", target: "n1", kind: "relates_to", rationale: "" },
          { source: "n1", target: "nope", kind: "relates_to", rationale: "" },
        ],
      },
      ctx,
    );
    expect(plan.vines).toEqual([
      { source: { kind: "new", key: "n1" }, target: { kind: "existing", id: "p1" }, kind: "grows_into" },
      { source: { kind: "new", key: "n1" }, target: { kind: "existing", id: "t1" }, kind: "relates_to" },
    ]);
    expect(plan.dropped.map((d) => d.reason)).toEqual([
      "not an idea in the garden",
      "duplicate vine",
      "already connected",
      "joins an idea to itself",
      "an end isn't a known idea",
    ]);
  });

  it("caps new ideas per round and survives a malformed reply", () => {
    const labels = ["Tool shed", "Soup night", "Bike repair", "Story circle", "Night market", "Mural walk", "Book exchange"];
    const many = labels.slice(0, MAX_NEW_NODES + 2).map((label, i) => newNode(`n${i}`, "seed", label));
    const plan = planFromProposal({ new_nodes: many, reinforce: [], new_vines: [] }, ctx);
    expect(plan.nodes).toHaveLength(MAX_NEW_NODES);
    expect(planFromProposal("nonsense", ctx)).toEqual({ nodes: [], vines: [], reinforce: [], dropped: [] });
  });
});
