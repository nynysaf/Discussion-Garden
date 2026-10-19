/**
 * Semantic enrichment for the public archive (run on your laptop with OPENAI_API_KEY).
 * Rewrites movement titles/summaries, AI sensemaking map, and idea-phrase word cloud.
 *
 * Usage: node --env-file=.env.local scripts/archive/enrich-with-ai.mjs
 *
 * The deployed site never calls OpenAI — this only refreshes static JSON.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { phraseWeights, publicArchiveDir, writeJson } from "./lib.mjs";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_SYNTHESIS_MODEL || "gpt-4o-mini";

if (!apiKey) {
  console.error("OPENAI_API_KEY missing. Add it to .env.local and re-run.");
  process.exit(1);
}

const transcript = JSON.parse(await readFile(join(publicArchiveDir, "transcript-redacted.json"), "utf8"));
const movementsDoc = JSON.parse(await readFile(join(publicArchiveDir, "movements.json"), "utf8"));
const segments = transcript.segments;
const byId = new Map(segments.map((s) => [s.id, s]));

function excerptForMovement(m, maxChars = 3500) {
  const lines = m.segmentIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((s) => `${s.voice}: ${s.text}`);
  let out = "";
  for (const line of lines) {
    if (out.length + line.length + 1 > maxChars) break;
    out += (out ? "\n" : "") + line;
  }
  return out || "(little talk captured in this stretch)";
}

const movementPayload = movementsDoc.movements.map((m) => ({
  id: m.id,
  day: m.day,
  inquiry: m.inquiry ?? null,
  priorTitle: m.title,
  excerpt: excerptForMovement(m),
}));

console.log(`Enriching ${movementPayload.length} movements + AI map via ${model}…`);

const movementResult = await chatJson({
  system: `You are a careful qualitative researcher summarizing a community festival dialogue called Discussion Garden.
Voices are anonymous garden animals. Never invent names. Never quote private trauma.
For each movement, write:
- title: 4–10 words capturing the IDEA of that stretch (not a truncated inquiry; not filler words)
- summary: 2–4 full sentences (a real paragraph) describing what people explored, tensions, and how the talk moved
Return JSON only matching the schema.`,
  user: JSON.stringify({ movements: movementPayload }),
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["movements"],
    properties: {
      movements: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "summary"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
          },
        },
      },
    },
  },
});

const enrichedById = new Map(movementResult.movements.map((m) => [m.id, m]));
const movements = movementsDoc.movements.map((m) => {
  const e = enrichedById.get(m.id);
  return {
    ...m,
    title: e?.title?.trim() || m.title,
    summary: e?.summary?.trim() || m.summary,
  };
});

await writeJson(join(publicArchiveDir, "movements.json"), {
  exportedAt: new Date().toISOString(),
  enrichedWith: model,
  movements,
});

// Sample across the weekend for themes + phrases
const sample = sampleCorpus(segments, 12_000);
const mapResult = await chatJson({
  system: `You map ideas from a festival dialogue transcript into a knowledge garden.
Return meaningful THEMES (big ideas), SPROUTS (emerging concepts), and SEEDS (concrete practices or images).
Labels must be short idea phrases (≤6 words), never function words like "there's", "things", "thinking", "people".
Essays: 2–3 sentences on what the room meant.
Also return keyPhrases: multi-word idea phrases that mattered (e.g. "collective action", "signal and noise"), not stopwords.
quoteIds must be chosen from the provided candidate segment ids when possible; otherwise use [].`,
  user: JSON.stringify({
    guidance:
      "Anchor themes include signal vs noise, presence, dialogue toward action, threshold/listening, healing, community, futures — but follow the transcript.",
    candidates: sample.candidates,
    text: sample.text,
  }),
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["nodes", "vines", "keyPhrases"],
    properties: {
      nodes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "tier", "label", "weight", "essay", "quoteIds"],
          properties: {
            id: { type: "string" },
            tier: { type: "string", enum: ["theme", "sprout", "seed"] },
            label: { type: "string" },
            weight: { type: "number" },
            essay: { type: "string" },
            quoteIds: { type: "array", items: { type: "string" } },
          },
        },
      },
      vines: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "sourceId", "targetId", "kind"],
          properties: {
            id: { type: "string" },
            sourceId: { type: "string" },
            targetId: { type: "string" },
            kind: { type: "string", enum: ["grows_into", "relates_to"] },
          },
        },
      },
      keyPhrases: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["term", "weight"],
          properties: {
            term: { type: "string" },
            weight: { type: "number" },
          },
        },
      },
    },
  },
});

const nodeIds = new Set(mapResult.nodes.map((n) => n.id));
const aiMap = {
  layer: "ai",
  title: "AI sensemaking",
  caption:
    "Offline semantic reading of the redacted corpus — themes and phrases about ideas people explored, not stopwords.",
  nodes: mapResult.nodes.map((n) => ({
    id: n.id,
    tier: n.tier,
    label: n.label.slice(0, 48),
    weight: Math.max(
      n.tier === "theme" ? 5 : n.tier === "sprout" ? 3 : 2,
      Math.min(8, Math.round(n.weight || 1)),
    ),
    originSessionId: null,
    essay: n.essay,
    quoteIds: (n.quoteIds || []).filter((id) => byId.has(id)).slice(0, 4),
    liveNodeIds: [],
  })),
  vines: (mapResult.vines || []).filter((v) => nodeIds.has(v.sourceId) && nodeIds.has(v.targetId)),
};

await writeJson(join(publicArchiveDir, "ai-sensemaking-map.json"), aiMap);

const phraseHits = new Map();
// Corpus bigrams/trigrams first (real frequency), then boost AI idea phrases.
for (const p of phraseWeights(segments, 100)) {
  phraseHits.set(p.term.toLowerCase(), p);
}
for (const p of mapResult.keyPhrases || []) {
  const display = p.term.trim();
  const key = display.toLowerCase();
  if (key.length < 4) continue;
  const ids = [];
  for (const s of segments) {
    if (s.text.toLowerCase().includes(key) && ids.length < 6) ids.push(s.id);
  }
  const prior = phraseHits.get(key);
  phraseHits.set(key, {
    term: display,
    weight: Math.max(prior?.weight ?? 0, Number(p.weight) || 1) + 4,
    segmentIds: ids.length ? ids : prior?.segmentIds ?? [],
  });
}

await writeJson(join(publicArchiveDir, "wordcloud.json"), {
  exportedAt: new Date().toISOString(),
  enrichedWith: model,
  words: [...phraseHits.values()].sort((a, b) => b.weight - a.weight).slice(0, 80),
});

console.log(
  `Done: ${movements.length} movement summaries, ${aiMap.nodes.length} AI nodes, ${phraseHits.size} phrases.`,
);

function sampleCorpus(segs, maxChars) {
  const step = Math.max(1, Math.floor(segs.length / 80));
  const picked = [];
  for (let i = 0; i < segs.length; i += step) picked.push(segs[i]);
  let text = "";
  const candidates = [];
  for (const s of picked) {
    const line = `[${s.id}] ${s.voice}: ${s.text}\n`;
    if (text.length + line.length > maxChars) break;
    text += line;
    candidates.push(s.id);
  }
  return { text, candidates };
}

async function chatJson({ system, user, schema }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      temperature: 0.35,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "archive_enrichment", strict: true, schema },
      },
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${body?.error?.message ?? "failed"}`);
  }
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");
  return JSON.parse(content);
}
