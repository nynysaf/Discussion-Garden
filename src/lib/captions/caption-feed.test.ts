import { describe, expect, it } from "vitest";
import { toBubble } from "./bubble-accumulator";
import {
  INITIAL_FEED,
  appendRecent,
  feedReducer,
  visibleBubbles,
  voicesHeard,
} from "./caption-feed";
import { words } from "./test-helpers";

const bubble = (sentence: string, startMs: number, complete = true) =>
  toBubble("c1", words(sentence, 0, startMs), complete);

describe("appendRecent", () => {
  it("ignores bubbles it already has", () => {
    const a = bubble("One.", 0);
    expect(appendRecent([a], [a])).toEqual([a]);
  });

  it("keeps only the newest bubbles", () => {
    const list = [bubble("A.", 0), bubble("B.", 1000), bubble("C.", 2000)];
    expect(appendRecent([], list, 2).map((b) => b.finalText)).toEqual([
      "B.",
      "C.",
    ]);
  });
});

describe("feedReducer", () => {
  it("adds completed bubbles and replaces live ones", () => {
    const live = bubble("Still talking", 1000, false);
    const next = feedReducer(INITIAL_FEED, {
      type: "bubbles",
      completed: [bubble("Done.", 0)],
      live: [live],
    });
    expect(next.recent.map((b) => b.finalText)).toEqual(["Done."]);
    expect(next.live).toEqual([live]);
  });

  it("applies status changes", () => {
    const next = feedReducer(INITIAL_FEED, {
      type: "status",
      status: { audioStatus: "paused", speakerColoursOn: false },
    });
    expect(next.status).toEqual({
      audioStatus: "paused",
      speakerColoursOn: false,
    });
  });

  it("replaces everything with a snapshot", () => {
    const snap = [bubble("Earlier.", 0)];
    const next = feedReducer(
      { ...INITIAL_FEED, recent: [bubble("Old.", 5000)] },
      {
        type: "snapshot",
        recent: snap,
        live: [],
        status: { audioStatus: "live", speakerColoursOn: true },
      },
    );
    expect(next.recent).toEqual(snap);
    expect(next.status.audioStatus).toBe("live");
  });

  it("ignores hello messages", () => {
    expect(feedReducer(INITIAL_FEED, { type: "hello" })).toBe(INITIAL_FEED);
  });
});

describe("voicesHeard", () => {
  it("is empty before anyone speaks", () => {
    expect(voicesHeard(INITIAL_FEED)).toEqual([]);
  });

  it("lists each speaker once, in order of first appearance", () => {
    const feed = {
      ...INITIAL_FEED,
      recent: [
        toBubble("c1", words("Hi.", 2, 0), true),
        toBubble("c1", words("Hello.", 0, 1000), true),
        toBubble("c1", words("Again.", 2, 2000), true),
      ],
      live: [toBubble("c1", words("And me", 1, 3000), false)],
    };
    expect(voicesHeard(feed)).toEqual([2, 0, 1]);
  });

  it("only counts the newest connection", () => {
    const feed = {
      ...INITIAL_FEED,
      recent: [
        toBubble("old", words("Before.", 3, 0), true),
        toBubble("new", words("After.", 0, 0), true),
      ],
    };
    expect(voicesHeard(feed)).toEqual([0]);
  });
});

describe("visibleBubbles", () => {
  it("puts live bubbles last and limits the count", () => {
    const feed = {
      ...INITIAL_FEED,
      recent: [bubble("A.", 0), bubble("B.", 1000)],
      live: [bubble("C", 2000, false)],
    };
    expect(visibleBubbles(feed, 2).map((b) => b.finalText)).toEqual([
      "B.",
      "C",
    ]);
  });
});
