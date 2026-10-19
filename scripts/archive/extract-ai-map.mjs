/**
 * Clara-style knowledge map: ≤6 entities per movement, merge on normalized label.
 * Target: ~80–150 nodes from ~20 movements.
 *
 * Usage: node --env-file=.env.local scripts/archive/extract-ai-map.mjs
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { phraseWeights, publicArchiveDir, writeJson } from "./lib.mjs";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_SYNTHESIS_MODEL || "gpt-4o-mini";
const MAX_ENTITIES = 6;
const MAX_CHARS = 6_000;

if (!apiKey) {
  console.error("OPENAI_API_KEY missing.");
  process.exit(1);
}

const transcript = JSON.parse(await readFile(join(publicArchiveDir, "transcript-redacted.json"), "utf8"));
const movementsDoc = JSON.parse(await readFile(join(publicArchiveDir, "movements.json"), "utf8"));
const segments = transcript.segments;
const byId = new Map(segments.map((s) => [s.id, s]));

const TIER_RANK = { seed: 1, sprout: 2, theme: 3 };

function normalizeLabel(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const extractSchema = {
  type: "object",
  additionalProperties: false,
  required: ["nodes", "edges", "keyPhrases"],
  properties: {
    nodes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tier", "label", "essay"],
        properties: {
          tier: { type: "string", enum: ["theme", "sprout", "seed"] },
          label: { type: "string" },
          essay: { type: "string" },
        },
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceLabel", "targetLabel", "kind"],
        properties: {
          sourceLabel: { type: "string" },
          targetLabel: { type: "string" },
          kind: { type: "string", enum: ["grows_into", "relates_to"] },
        },
      },
    },
    keyPhrases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term"],
        properties: { term: { type: "string" } },
      },
    },
  },
};

/** @type {Map<string, object>} */
const merged = new Map();
/** @type {{ sourceKey: string, targetKey: string, kind: string }[]} */
const edgeBuf = [];
/** @type {Map<string, number>} */
const phraseBoost = new Map();

/** Sliding windows across the corpus (Clara: many small docs). ~45 segments ≈ one “doc”. */
const WINDOW = 45;
const chunks = [];
for (const day of ["day_1", "day_2"]) {
  const daySegs = segments.filter((s) => s.day === day);
  for (let start = 0; start < daySegs.length; start += WINDOW) {
    const slice = daySegs.slice(start, start + WINDOW);
    if (slice.length < 12) continue;
    const mov = movementsDoc.movements.find(
      (m) => m.day === day && slice.some((s) => m.segmentIds?.includes(s.id)),
    );
    chunks.push({
      id: `${day}-w${Math.floor(start / WINDOW) + 1}`,
      day,
      title: mov?.title ?? `${day === "day_1" ? "Saturday" : "Sunday"} window`,
      inquiry: mov?.inquiry ?? null,
      summary: mov?.summary ?? null,
      segmentIds: slice.map((s) => s.id),
      text: slice.map((s) => `${s.voice}: ${s.text}`).join("\n").slice(0, MAX_CHARS),
    });
  }
}

console.log(`Extracting ≤${MAX_ENTITIES} entities from ${chunks.length} transcript windows…`);

for (let i = 0; i < chunks.length; i++) {
  const chunk = chunks[i];
  if (chunk.text.length < 120) {
    console.log(`  [${i + 1}/${chunks.length}] ${chunk.id} — skip (too short)`);
    continue;
  }
  process.stdout.write(`  [${i + 1}/${chunks.length}] ${chunk.id}… `);
  try {
    const result = await chatJson({
      system: `You build a Discussion Garden knowledge map from one section of festival dialogue.
Propose at most ${MAX_ENTITIES} distinct ideas:
- seed = concrete practice, image, or example
- sprout = named concept emerging in talk
- theme = recurring big topic
Labels: 2–5 words, idea phrases only (never "things", "there's", "people", "thinking").
Essay: one or two sentences on what THIS stretch meant.
Edges only among labels you just proposed (grows_into = more specific→broader, relates_to = sibling).
keyPhrases: up to 5 multi-word idea phrases from the text.
If little signal, return fewer nodes — empty is OK.`,
      user: JSON.stringify({
        windowId: chunk.id,
        day: chunk.day,
        title: chunk.title,
        inquiry: chunk.inquiry,
        summary: chunk.summary,
        transcript: chunk.text,
      }),
      schema: extractSchema,
    });

    const localKeys = new Map();
    for (const n of result.nodes || []) {
      const label = (n.label || "").trim().slice(0, 48);
      const key = normalizeLabel(label);
      if (!key || key.length < 3) continue;
      localKeys.set(normalizeLabel(n.label), key);
      localKeys.set(key, key);

      const quotes = pickQuotesNear(chunk.segmentIds, label, 2);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          id: `ai-${key.replace(/\s+/g, "-").slice(0, 40)}`,
          tier: n.tier,
          label,
          weight: n.tier === "theme" ? 4 : n.tier === "sprout" ? 3 : 2,
          originSessionId: chunk.day,
          essay: n.essay,
          quoteIds: quotes,
          liveNodeIds: [],
          _seen: 1,
        });
      } else {
        existing._seen += 1;
        existing.weight = Math.min(10, existing.weight + 1);
        if (TIER_RANK[n.tier] > TIER_RANK[existing.tier]) existing.tier = n.tier;
        if ((n.essay || "").length > (existing.essay || "").length) existing.essay = n.essay;
        for (const q of quotes) {
          if (!existing.quoteIds.includes(q) && existing.quoteIds.length < 4) {
            existing.quoteIds.push(q);
          }
        }
        if (existing.originSessionId && existing.originSessionId !== chunk.day) {
          existing.originSessionId = null;
        }
      }
    }

    for (const e of result.edges || []) {
      const sk = localKeys.get(normalizeLabel(e.sourceLabel));
      const tk = localKeys.get(normalizeLabel(e.targetLabel));
      if (!sk || !tk || sk === tk) continue;
      edgeBuf.push({ sourceKey: sk, targetKey: tk, kind: e.kind || "relates_to" });
    }

    for (const p of result.keyPhrases || []) {
      const term = (p.term || "").trim().toLowerCase();
      if (term.length < 4) continue;
      phraseBoost.set(term, (phraseBoost.get(term) ?? 0) + 1);
    }
    console.log(`${(result.nodes || []).length} nodes (map=${merged.size})`);
  } catch (err) {
    console.log(`FAIL ${err instanceof Error ? err.message : err}`);
  }
}

// Resolve vines against merged keys; dedupe
const vineSeen = new Set();
const vines = [];
for (const e of edgeBuf) {
  if (!merged.has(e.sourceKey) || !merged.has(e.targetKey)) continue;
  const a = merged.get(e.sourceKey);
  const b = merged.get(e.targetKey);
  const pair = [a.id, b.id].sort().join(">");
  const dedupe = `${pair}:${e.kind}`;
  if (vineSeen.has(dedupe)) continue;
  vineSeen.add(dedupe);
  vines.push({
    id: `ai-vine-${vines.length + 1}`,
    sourceId: a.id,
    targetId: b.id,
    kind: e.kind,
  });
}

// Soft theme↔theme relates links when they co-occurred often via shared edges — skip; vines enough

const nodes = [...merged.values()].map(({ _seen, ...n }) => n);
nodes.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));

const aiMap = {
  layer: "ai",
  title: "AI sensemaking",
  caption:
    "Clara-style reading: up to six ideas per dialogue movement, merged when labels match. Drag plants to pin; double-click to release.",
  nodes,
  vines,
};

await writeJson(join(publicArchiveDir, "ai-sensemaking-map.json"), aiMap);

const phraseHits = new Map();
for (const p of phraseWeights(segments, 100)) {
  phraseHits.set(p.term.toLowerCase(), p);
}
for (const [term, boost] of phraseBoost) {
  const ids = [];
  for (const s of segments) {
    if (s.text.toLowerCase().includes(term) && ids.length < 6) ids.push(s.id);
  }
  const prior = phraseHits.get(term);
  phraseHits.set(term, {
    term,
    weight: Math.max(prior?.weight ?? 0, 1) + boost * 3,
    segmentIds: ids.length ? ids : prior?.segmentIds ?? [],
  });
}
await writeJson(join(publicArchiveDir, "wordcloud.json"), {
  exportedAt: new Date().toISOString(),
  enrichedWith: model,
  words: [...phraseHits.values()].sort((a, b) => b.weight - a.weight).slice(0, 80),
});

console.log(`Wrote ${nodes.length} nodes, ${vines.length} vines → ai-sensemaking-map.json`);

function pickQuotesNear(segmentIds, label, n) {
  const needle = normalizeLabel(label).split(" ").filter((w) => w.length > 3);
  const scored = [];
  for (const id of segmentIds) {
    const s = byId.get(id);
    if (!s) continue;
    const t = s.text.toLowerCase();
    const hits = needle.filter((w) => t.includes(w)).length;
    if (hits > 0) scored.push({ id, hits });
  }
  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, n).map((x) => x.id);
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
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "movement_graph", strict: true, schema },
      },
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${body?.error?.message ?? "failed"}`);
  }
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("no content");
  return JSON.parse(content);
}
