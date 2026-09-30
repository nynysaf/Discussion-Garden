import { describe, expect, it } from "vitest";
import { BubbleAccumulator } from "./bubble-accumulator";
import { words } from "./test-helpers";

const text = (b: { finalText: string; interimText: string }) =>
  [b.finalText, b.interimText].filter(Boolean).join(" ");

describe("BubbleAccumulator", () => {
  it("shows interim words as a live bubble without completing it", () => {
    const acc = new BubbleAccumulator("c1");
    const update = acc.ingest(words("We planted", 0, 0, false), false);
    expect(update.completed).toEqual([]);
    expect(update.live).toHaveLength(1);
    expect(update.live[0].interimText).toBe("We planted");
    expect(update.live[0].finalText).toBe("");
  });

  it("replaces interim words with the next interim result", () => {
    const acc = new BubbleAccumulator("c1");
    acc.ingest(words("We plan", 0, 0, false), false);
    const update = acc.ingest(words("We planted seeds", 0, 0, false), false);
    expect(text(update.live[0])).toBe("We planted seeds");
  });

  it("completes a bubble when a final result ends the sentence", () => {
    const acc = new BubbleAccumulator("c1");
    acc.ingest(words("We planted", 0, 0, false), false);
    const update = acc.ingest(words("We planted seeds."), true);
    expect(update.completed).toHaveLength(1);
    expect(update.completed[0]).toMatchObject({
      finalText: "We planted seeds.",
      isComplete: true,
      speaker: 0,
      connectionId: "c1",
    });
    expect(update.live).toEqual([]);
  });

  it("keeps an unfinished final sentence open until it ends", () => {
    const acc = new BubbleAccumulator("c1");
    const first = acc.ingest(words("We planted"), true);
    expect(first.completed).toEqual([]);
    expect(first.live[0].finalText).toBe("We planted");

    const second = acc.ingest(words("seeds today.", 0, 600), true);
    expect(second.completed.map((b) => b.finalText)).toEqual([
      "We planted seeds today.",
    ]);
  });

  it("mixes final and interim words in the live bubble", () => {
    const acc = new BubbleAccumulator("c1");
    acc.ingest(words("We planted"), true);
    const update = acc.ingest(words("seeds", 0, 600, false), false);
    expect(update.live[0].finalText).toBe("We planted");
    expect(update.live[0].interimText).toBe("seeds");
  });

  it("completes the previous speaker's bubble when someone else talks", () => {
    const acc = new BubbleAccumulator("c1");
    acc.ingest(words("So what I", 0), true);
    const update = acc.ingest(words("Can I add", 1, 1000), true);
    expect(update.completed.map((b) => [b.speaker, b.finalText])).toEqual([
      [0, "So what I"],
    ]);
    expect(update.live[0]).toMatchObject({ speaker: 1, finalText: "Can I add" });
  });

  it("reports each completed bubble exactly once", () => {
    const acc = new BubbleAccumulator("c1");
    const a = acc.ingest(words("One. Two."), true);
    const b = acc.ingest(words("Three.", 0, 2000), true);
    const ids = [...a.completed, ...b.completed].map((x) => x.id);
    expect(new Set(ids).size).toBe(3);
    expect(b.completed.map((x) => x.finalText)).toEqual(["Three."]);
  });

  it("closes an unpunctuated bubble on a pause", () => {
    const acc = new BubbleAccumulator("c1");
    acc.ingest(words("and then we"), true);
    const update = acc.flushPause();
    expect(update.completed.map((b) => b.finalText)).toEqual(["and then we"]);
    expect(update.live).toEqual([]);
  });

  it("waits on a pause if interim words are still arriving", () => {
    const acc = new BubbleAccumulator("c1");
    acc.ingest(words("and then"), true);
    acc.ingest(words("we", 0, 600, false), false);
    const update = acc.flushPause();
    expect(update.completed).toEqual([]);
    expect(update.live).toHaveLength(1);
  });

  it("finishes interim words on stop so nothing is lost", () => {
    const acc = new BubbleAccumulator("c1");
    acc.ingest(words("last words", 0, 0, false), false);
    const update = acc.flushAll();
    expect(update.completed.map((b) => b.finalText)).toEqual(["last words"]);
    expect(update.live).toEqual([]);
  });

  it("gives bubbles from different connections different ids", () => {
    const a = new BubbleAccumulator("c1").ingest(words("Hi."), true);
    const b = new BubbleAccumulator("c2").ingest(words("Hi."), true);
    expect(a.completed[0].id).not.toBe(b.completed[0].id);
  });

  it("clears stale interim words when a final result arrives empty", () => {
    const acc = new BubbleAccumulator("c1");
    acc.ingest(words("um", 0, 0, false), false);
    const update = acc.ingest([], true);
    expect(update.live).toEqual([]);
  });
});
