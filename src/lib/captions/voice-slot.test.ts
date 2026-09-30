import { describe, expect, it } from "vitest";
import { VOICE_ANIMALS, voiceFor } from "./voice-slot";

describe("voiceFor", () => {
  it("maps the first voices to the design guide animals and colours", () => {
    expect(voiceFor(0)).toEqual({
      animal: "Frog",
      emojiSrc: "/voices/frog.svg",
      colourSlot: 1,
    });
    expect(voiceFor(1)).toMatchObject({ animal: "Bird", colourSlot: 2 });
    expect(voiceFor(5)).toMatchObject({ animal: "Caterpillar", colourSlot: 6 });
  });

  it("repeats colours after 6 but keeps animals unique up to 12", () => {
    expect(voiceFor(6)).toMatchObject({ animal: "Hedgehog", colourSlot: 1 });
    expect(voiceFor(11)).toMatchObject({ animal: "Squirrel", colourSlot: 6 });
  });

  it("repeats animals after 12", () => {
    expect(voiceFor(12)).toMatchObject({ animal: "Frog", colourSlot: 1 });
  });

  it("treats invalid speaker numbers as the first voice", () => {
    expect(voiceFor(-1).animal).toBe("Frog");
    expect(voiceFor(Number.NaN).animal).toBe("Frog");
    expect(voiceFor(1.5).animal).toBe("Frog");
  });

  it("has 12 distinct animals, none of them human names", () => {
    const names = VOICE_ANIMALS.map((a) => a.animal);
    expect(new Set(names).size).toBe(12);
  });
});
