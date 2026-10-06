import type { GardenContext } from "./garden-context";
import type { TranscriptWindow } from "./window";

export const SYSTEM_PROMPT = `You tend the Discussion Garden: a live map of ideas from a public festival conversation called "We Create Our Futures". You read the newest stretch of transcript and suggest small, careful additions to one shared garden of ideas. A host reviews your suggestions.

Tiers:
- seed: a specific experience, example, or fact someone actually said (e.g. "Tool library on Elm Street").
- sprout: a shared principle that connects several seeds (e.g. "Lending beats buying").
- theme: a big insight that unites several sprouts (e.g. "Neighbours as infrastructure").

Vines: "grows_into" joins a seed to a sprout, or a sprout to a theme. "relates_to" joins any two related ideas.

Rules:
1. Prefer reinforcing an existing idea over adding a near-duplicate. If the talk revisits an existing idea, list its ref in "reinforce" instead of adding a new one.
2. Every seed must be grounded in what was actually said. Cite the transcript lines in segment_refs. Never invent examples.
3. Add a sprout only when it connects at least two seeds (new or existing). Add a theme only when it unites at least two sprouts. Connect every new idea with vines.
4. Labels: at most 6 words, plain everyday language, sentence case, no quotes, no trailing period. Never include anyone's name, role, or who said what.
5. At most 4 new ideas per window. If the window is small talk, logistics, or has little substance, return empty lists.
6. rationale: one short sentence telling the host why.
7. Refer to existing ideas by their ref (e1, e2, …) and to your own new ideas by their key (n1, n2, …).`;

export function buildUserMessage({
  question,
  garden,
  window,
}: {
  question: string | null;
  garden: GardenContext;
  window: TranscriptWindow;
}): string {
  return [
    `Live question on screen: ${question ? `"${question}"` : "(none)"}`,
    "",
    "Existing garden (the whole festival so far):",
    garden.text || "(empty — nothing planted yet)",
    "",
    "New transcript since the last update:",
    window.text,
  ].join("\n");
}

const refs = { type: "array", items: { type: "string" } } as const;

/** Strict JSON Schema for OpenAI Structured Outputs (every field required, no extras). */
export const PROPOSAL_SCHEMA = {
  type: "object",
  properties: {
    new_nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", description: "n1, n2, …" },
          tier: { type: "string", enum: ["seed", "sprout", "theme"] },
          label: { type: "string" },
          rationale: { type: "string" },
          segment_refs: { ...refs, description: "Transcript refs (s1, s2, …) this came from" },
        },
        required: ["key", "tier", "label", "rationale", "segment_refs"],
        additionalProperties: false,
      },
    },
    reinforce: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ref: { type: "string", description: "Existing idea ref (e1, e2, …)" },
          rationale: { type: "string" },
          segment_refs: refs,
        },
        required: ["ref", "rationale", "segment_refs"],
        additionalProperties: false,
      },
    },
    new_vines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { type: "string", description: "A new key (n1) or existing ref (e1)" },
          target: { type: "string", description: "A new key (n1) or existing ref (e1)" },
          kind: { type: "string", enum: ["grows_into", "relates_to"] },
          rationale: { type: "string" },
        },
        required: ["source", "target", "kind", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["new_nodes", "reinforce", "new_vines"],
  additionalProperties: false,
} as const;
