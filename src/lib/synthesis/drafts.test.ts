import { describe, expect, it } from "vitest";
import { approveAllSteps, buildQueue, describeResult, EMPTY_DRAFTS, type DraftData } from "./drafts";

const at = (minute: number) => `2026-10-17T15:${String(minute).padStart(2, "0")}:00Z`;

const data: DraftData = {
  nodes: [
    { id: "d-seed", tier: "seed", label: "Tool library", rationale: "An example.", segmentIds: ["s1", "gone"], createdAt: at(1) },
    { id: "d-sprout", tier: "sprout", label: "Lending beats buying", rationale: null, segmentIds: [], createdAt: at(2) },
  ],
  vines: [
    { id: "v-new-new", sourceId: "d-seed", targetId: "d-sprout", kind: "grows_into" },
    { id: "v-new-pub", sourceId: "d-sprout", targetId: "p-theme", kind: "grows_into" },
    { id: "v-pub-pub", sourceId: "p-seed", targetId: "p-theme", kind: "relates_to" },
    { id: "v-orphan", sourceId: "rejected-node", targetId: "p-theme", kind: "relates_to" },
  ],
  reinforcements: [
    { id: "r1", nodeId: "p-theme", rationale: "Came up again.", segmentIds: ["s2"], createdAt: at(3) },
    { id: "r-gone", nodeId: "deleted-node", rationale: null, segmentIds: [], createdAt: at(3) },
    { id: "r2", nodeId: "p-theme", rationale: "And again.", segmentIds: ["s2", "s1"], createdAt: at(4) },
  ],
  published: [
    { id: "p-theme", tier: "theme", label: "Neighbours as infrastructure" },
    { id: "p-seed", tier: "seed", label: "Soup night" },
  ],
  quotes: { s1: "We set up a tool library.", s2: "Neighbours keep coming up." },
  lastRun: null,
};

describe("buildQueue", () => {
  const queue = buildQueue(data);

  it("lists new ideas (higher tiers first), then standalone vines, then “mentioned again”", () => {
    expect(queue.map((i) => `${i.type}:${i.id}`)).toEqual([
      "node:d-sprout",
      "node:d-seed",
      "vine:v-pub-pub",
      "reinforce:r1",
    ]);
  });

  it("shows how each new idea joins the garden and what was said", () => {
    const seed = queue.find((i) => i.id === "d-seed");
    const sprout = queue.find((i) => i.id === "d-sprout");
    expect(seed).toMatchObject({
      links: [{ label: "Lending beats buying", kind: "grows_into", outgoing: true, waiting: true }],
      quotes: ["We set up a tool library."],
    });
    expect(sprout).toMatchObject({
      links: [
        { label: "Tool library", outgoing: false, waiting: true },
        { label: "Neighbours as infrastructure", outgoing: true, waiting: false },
      ],
    });
  });

  it("labels standalone vines from the published garden", () => {
    expect(queue.find((i) => i.type === "vine")).toMatchObject({
      sourceLabel: "Soup night",
      targetLabel: "Neighbours as infrastructure",
    });
  });

  it("folds repeated “mentioned again” for one idea into a single card", () => {
    expect(queue.filter((i) => i.type === "reinforce")).toEqual([
      {
        type: "reinforce",
        id: "r1",
        ids: ["r1", "r2"],
        label: "Neighbours as infrastructure",
        rationale: "Came up again.",
        quotes: ["Neighbours keep coming up.", "We set up a tool library."],
      },
    ]);
  });

  it("is empty when nothing is waiting", () => {
    expect(buildQueue(EMPTY_DRAFTS)).toEqual([]);
  });
});

describe("approveAllSteps", () => {
  it("approves ideas before vines before every “mentioned again”", () => {
    const queue = buildQueue(data);
    const shuffled = [queue[3], queue[2], queue[1], queue[0]];
    expect(approveAllSteps(shuffled).map((s) => `${s.type}:${s.id}`)).toEqual([
      "node:d-seed",
      "node:d-sprout",
      "vine:v-pub-pub",
      "reinforce:r1",
      "reinforce:r2",
    ]);
  });
});

describe("describeResult", () => {
  const ok = (nodes: number, vines: number, reinforce: number, mode: "hybrid" | "auto" = "hybrid") =>
    describeResult({ status: "ok", mode, runId: "r", added: { nodes, vines, reinforce }, dropped: 0 });

  it("explains skips", () => {
    expect(describeResult({ status: "skipped", reason: "manual" })).toMatch(/Manual/);
    expect(describeResult({ status: "skipped", reason: "quiet" })).toMatch(/Not enough new talk/);
  });

  it("summarises what was added", () => {
    expect(ok(3, 2, 1)).toBe("3 new ideas, 2 vines and 1 “mentioned again” waiting for your review below.");
    expect(ok(1, 0, 0)).toBe("1 new idea waiting for your review below.");
    expect(ok(0, 1, 0, "auto")).toBe("Added 1 vine straight to the garden.");
    expect(ok(0, 0, 0)).toMatch(/Nothing new/);
  });
});
