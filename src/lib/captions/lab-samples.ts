import type { CaptionBubble } from "./types";

/** Made-up bubbles for /captions/lab — never real festival talk. */
export const LAB_BUBBLES: CaptionBubble[] = [
  {
    id: "lab:1",
    connectionId: "lab",
    speaker: 0,
    finalText: "What I keep coming back to is the idea of shared tools on every block.",
    interimText: "",
    startMs: 0,
    endMs: 4000,
    isComplete: true,
  },
  {
    id: "lab:2",
    connectionId: "lab",
    speaker: 1,
    finalText: "Can you say more about who looks after them day to day?",
    interimText: "",
    startMs: 4500,
    endMs: 7000,
    isComplete: true,
  },
  {
    id: "lab:3",
    connectionId: "lab",
    speaker: 0,
    finalText: "A rotating crew — neighbours take a month each, and the library holds the keys.",
    interimText: "",
    startMs: 7500,
    endMs: 12000,
    isComplete: true,
  },
  {
    id: "lab:4",
    connectionId: "lab",
    speaker: 2,
    finalText: "That sounds like something we could try on our street this spring.",
    interimText: "",
    startMs: 12500,
    endMs: 16000,
    isComplete: true,
  },
  {
    id: "lab:5",
    connectionId: "lab",
    speaker: 1,
    finalText: "",
    interimText: "I'm curious what happens when someone moves away mid-month…",
    startMs: 16500,
    endMs: 19000,
    isComplete: false,
  },
];

export const LAB_QUESTION = "How might we share tools without creating more work?";
export const LAB_TITLE = "Neighbourhood commons";
export const LAB_NEXT = "Opening circle";
