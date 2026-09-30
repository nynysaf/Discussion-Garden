import { describe, expect, it } from "vitest";
import { endsSentence, groupWords, joinWords } from "./group-words";
import { words } from "./test-helpers";

describe("endsSentence", () => {
  it.each(["done.", "really?", "wow!", "so…", 'said "yes."', "(ok.)"])(
    "treats %s as a sentence end",
    (text) => expect(endsSentence(text)).toBe(true),
  );

  it.each(["and", "well,", "Dr", "3.5"])("does not end on %s", (text) =>
    expect(endsSentence(text)).toBe(false),
  );
});

describe("groupWords", () => {
  it("keeps one sentence from one speaker together", () => {
    const groups = groupWords(words("We planted seeds last spring."));
    expect(groups).toHaveLength(1);
    expect(joinWords(groups[0])).toBe("We planted seeds last spring.");
  });

  it("splits two sentences from the same speaker", () => {
    const groups = groupWords(words("First idea. Second idea."));
    expect(groups.map(joinWords)).toEqual(["First idea.", "Second idea."]);
  });

  it("splits when the speaker changes mid-sentence", () => {
    const input = [...words("So what I", 0), ...words("Can I add", 1, 1000)];
    const groups = groupWords(input);
    expect(groups.map(joinWords)).toEqual(["So what I", "Can I add"]);
    expect(groups.map((g) => g[0].speaker)).toEqual([0, 1]);
  });

  it("returns nothing for no words", () => {
    expect(groupWords([])).toEqual([]);
  });
});
