export type ColourSlot = 1 | 2 | 3 | 4 | 5 | 6;

export type Voice = {
  /** Screen-reader name. Voices are anonymous — never a person's name. */
  animal: string;
  emojiSrc: string;
  colourSlot: ColourSlot;
};

export const VOICE_ANIMALS = [
  { animal: "Frog", file: "frog" },
  { animal: "Bird", file: "bird" },
  { animal: "Ladybug", file: "ladybug" },
  { animal: "Butterfly", file: "butterfly" },
  { animal: "Bee", file: "bee" },
  { animal: "Caterpillar", file: "caterpillar" },
  { animal: "Hedgehog", file: "hedgehog" },
  { animal: "Snail", file: "snail" },
  { animal: "Owl", file: "owl" },
  { animal: "Rabbit", file: "rabbit" },
  { animal: "Turtle", file: "turtle" },
  { animal: "Squirrel", file: "squirrel" },
] as const;

const COLOUR_SLOTS = 6;

/** Deepgram speaker number → animal (wraps after 12) + colour (wraps after 6). */
export function voiceFor(speaker: number): Voice {
  const index =
    Number.isInteger(speaker) && speaker >= 0 ? speaker : 0;
  const entry = VOICE_ANIMALS[index % VOICE_ANIMALS.length];
  return {
    animal: entry.animal,
    emojiSrc: `/voices/${entry.file}.svg`,
    colourSlot: ((index % COLOUR_SLOTS) + 1) as ColourSlot,
  };
}
