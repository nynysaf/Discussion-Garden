/**
 * Offline archive pipeline: parse → redact → movements / meta / wordcloud / AI map.
 * Writes private intermediates under scripts/archive/private/ (gitignored)
 * and public JSON under src/data/archive/ (safe to commit after review).
 *
 * Usage: node scripts/archive/build-archive.mjs
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  codeAttention,
  codeContact,
  ensureDirs,
  loadDayFiles,
  privateDir,
  publicArchiveDir,
  redactText,
  root,
  shouldDropSegment,
  phraseWeights,
  writeJson,
} from "./lib.mjs";

await ensureDirs();

const days = await loadDayFiles();
const allRaw = [];
const allInquiries = [];
for (const day of ["day_1", "day_2"]) {
  allRaw.push(...days[day].segments);
  allInquiries.push(...days[day].inquiries);
}

await writeJson(join(privateDir, "segments-raw.json"), { segments: allRaw, inquiries: allInquiries });

const redacted = [];
let dropped = 0;
for (const seg of allRaw) {
  if (shouldDropSegment(seg.text)) {
    dropped += 1;
    continue;
  }
  const text = redactText(seg.text);
  if (!text || text === "[Name]") {
    dropped += 1;
    continue;
  }
  redacted.push({
    id: seg.id,
    day: seg.day,
    voice: seg.voice,
    clock: seg.clock,
    text,
    redacted: text !== seg.text,
    attention: codeAttention(text),
    contact: codeContact(text),
  });
}

await writeJson(join(publicArchiveDir, "transcript-redacted.json"), {
  note: "Redacted festival transcript for public archive. Names replaced; sensitive lines removed. Review before sharing widely.",
  exportedAt: new Date().toISOString(),
  dropped,
  segments: redacted,
});

// Movements: one per inquiry, spanning segments until the next inquiry (same day).
const byDay = { day_1: [], day_2: [] };
for (const s of redacted) byDay[s.day].push(s);

const movements = [];
for (const day of ["day_1", "day_2"]) {
  const inqs = allInquiries.filter((i) => i.day === day);
  const segs = byDay[day];
  if (inqs.length === 0) {
    movements.push({
      id: `${day}-m0`,
      day,
      title: day === "day_1" ? "Saturday open dialogue" : "Sunday open dialogue",
      summary: "Conversation without a live-inquiry marker in this stretch.",
      segmentIds: segs.map((s) => s.id),
    });
    continue;
  }

  // Map inquiry afterSegmentIndex (raw) onto redacted ids by walking raw order
  const rawDay = days[day].segments;
  const rawIdToPos = new Map(rawDay.map((s, i) => [s.id, i]));

  const cuts = inqs.map((inq, i) => {
    const startRaw = inq.afterSegmentIndex + 1;
    const endRaw = i + 1 < inqs.length ? inqs[i + 1].afterSegmentIndex : rawDay.length - 1;
    const segmentIds = segs
      .filter((s) => {
        const pos = rawIdToPos.get(s.id);
        return pos != null && pos >= startRaw && pos <= endRaw;
      })
      .map((s) => s.id);
    return {
      id: `${day}-m${i + 1}`,
      day,
      title: inq.body.replace(/\?$/, "").trim() || inq.body,
      inquiry: inq.body,
      summary:
        `This stretch opened under the live inquiry “${inq.body}”. ` +
        `Run npm run archive:enrich to replace this stub with a full paragraph summary of what the room actually explored.`,
      segmentIds,
    };
  });

  // Prefatory talk before first inquiry
  const firstStart = inqs[0].afterSegmentIndex + 1;
  const prefaceIds = segs
    .filter((s) => {
      const pos = rawIdToPos.get(s.id);
      return pos != null && pos < firstStart;
    })
    .map((s) => s.id);
  if (prefaceIds.length > 0) {
    movements.push({
      id: `${day}-m0`,
      day,
      title: day === "day_1" ? "Saturday threshold and warm-up" : "Sunday arrival",
      summary:
        "Opening talk before the first live inquiry of the day. Run archive:enrich for a full paragraph on what this stretch held.",
      segmentIds: prefaceIds,
    });
  }
  movements.push(...cuts);
}

// Attach movementId onto a copy for meta (public transcript keeps movement via lookup)
const segToMovement = new Map();
for (const m of movements) {
  for (const id of m.segmentIds) segToMovement.set(id, m.id);
}
const transcriptWithMovements = redacted.map((s) => ({
  ...s,
  movementId: segToMovement.get(s.id) ?? undefined,
}));

await writeJson(join(publicArchiveDir, "transcript-redacted.json"), {
  note: "Redacted festival transcript for public archive. Names replaced; sensitive lines removed.",
  exportedAt: new Date().toISOString(),
  dropped,
  segments: transcriptWithMovements,
});

await writeJson(join(publicArchiveDir, "movements.json"), {
  exportedAt: new Date().toISOString(),
  movements,
});

const voiceCounts = {};
const attention = {};
const contact = {};
for (const s of transcriptWithMovements) {
  voiceCounts[s.voice] = (voiceCounts[s.voice] ?? 0) + 1;
  attention[s.attention] = (attention[s.attention] ?? 0) + 1;
  contact[s.contact] = (contact[s.contact] ?? 0) + 1;
}

let liveNodes = 0;
let liveVines = 0;
try {
  const snap = JSON.parse(await readFile(join(publicArchiveDir, "garden-snapshot.json"), "utf8"));
  liveNodes = snap.nodes?.length ?? 0;
  liveVines = snap.vines?.length ?? 0;
} catch {
  /* snapshot may not exist yet */
}

const meta = {
  hoursTalkApprox: 12,
  segmentCount: transcriptWithMovements.length,
  voiceCounts,
  dayCounts: {
    day_1: transcriptWithMovements.filter((s) => s.day === "day_1").length,
    day_2: transcriptWithMovements.filter((s) => s.day === "day_2").length,
  },
  inquiryCount: allInquiries.length,
  liveGardenNodes: liveNodes,
  liveGardenVines: liveVines,
  attention,
  contact,
};

await writeJson(join(publicArchiveDir, "meta.json"), meta);

// Phrase cloud (bigrams/trigrams). Prefer `npm run archive:enrich` for semantic phrases.
await writeJson(join(publicArchiveDir, "wordcloud.json"), {
  exportedAt: new Date().toISOString(),
  words: phraseWeights(transcriptWithMovements, 80),
});

// Placeholder AI map from inquiry themes only — enrich-with-ai replaces with semantic reading.
const aiNodes = allInquiries.slice(0, 10).map((inq, i) => ({
  id: `ai-theme-${i + 1}`,
  tier: "theme",
  label: ideaLabel(inq.body),
  weight: 4,
  originSessionId: inq.day,
  essay: `Placeholder from the live inquiry “${inq.body}”. Run archive:enrich for a full semantic reading.`,
  quoteIds: pickQuotes(transcriptWithMovements, inq.body.split(/\s+/).slice(0, 2).join(" "), 2),
  liveNodeIds: [],
}));
const aiVines = [];
for (let i = 0; i < aiNodes.length - 1; i++) {
  aiVines.push({
    id: `ai-theme-vine-${i + 1}`,
    sourceId: aiNodes[i].id,
    targetId: aiNodes[i + 1].id,
    kind: "relates_to",
  });
}

await writeJson(join(publicArchiveDir, "ai-sensemaking-map.json"), {
  layer: "ai",
  title: "AI sensemaking",
  caption:
    "Run npm run archive:enrich (with OPENAI_API_KEY) for a semantic reading of ideas — not stopword clusters.",
  nodes: aiNodes,
  vines: aiVines,
});

// Host-seeded map from Reflection themes (curated starter — edit host-seeded-map.json to refine)
const hostMap = {
  layer: "host",
  title: "Host reading",
  caption:
    "Themes the host found most meaningful after holding the room — presence, signal vs noise, threshold, and the path from dialogue toward action.",
  nodes: [
    {
      id: "host-theme-signal",
      tier: "theme",
      label: "Signal vs noise",
      weight: 5,
      originSessionId: null,
      essay:
        "The anchoring question of the weekend: how do we separate distraction from what deserves attention — in news, in rooms, and in our own speech?",
      quoteIds: pickQuotes(transcriptWithMovements, "signal", 2).concat(
        pickQuotes(transcriptWithMovements, "noise", 2),
      ).slice(0, 4),
      liveNodeIds: [],
    },
    {
      id: "host-theme-aporia",
      tier: "theme",
      label: "Entering not-knowing",
      weight: 5,
      originSessionId: null,
      essay:
        "Aporia — slowing into the unknown together — versus monologues and solutions-mode that keep everyone inside ideas they already carried in.",
      quoteIds: pickQuotes(transcriptWithMovements, "know", 3),
      liveNodeIds: [],
    },
    {
      id: "host-theme-threshold",
      tier: "theme",
      label: "The threshold",
      weight: 4,
      originSessionId: "day_1",
      essay:
        "Pebble as seed, silence before speech, humid air upstairs — designing an entrance that asks for intention and listening.",
      quoteIds: pickQuotes(transcriptWithMovements, "listen", 3),
      liveNodeIds: [],
    },
    {
      id: "host-theme-contact",
      tier: "theme",
      label: "Contact",
      weight: 5,
      originSessionId: null,
      essay:
        "Dialogue as contact improv: speaking into the shared middle with intention, feeling one another, not only reporting individual experience.",
      quoteIds: pickQuotes(transcriptWithMovements, "together", 3),
      liveNodeIds: [],
    },
    {
      id: "host-theme-presence",
      tier: "theme",
      label: "Presence in time",
      weight: 4,
      originSessionId: "day_2",
      essay:
        "How often did we speak into past, present, or future? Creating futures may need competence in the present — and imagination grounded in how the world works.",
      quoteIds: pickQuotes(transcriptWithMovements, "present", 2).concat(
        pickQuotes(transcriptWithMovements, "future", 2),
      ).slice(0, 4),
      liveNodeIds: [],
    },
    {
      id: "host-theme-action",
      tier: "theme",
      label: "Dialogue to action",
      weight: 4,
      originSessionId: null,
      essay:
        "Resonance in a room does not carry itself into action. Presence is one link; deciding, committing, and following up need structure the garden only began to offer.",
      quoteIds: pickQuotes(transcriptWithMovements, "action", 2).concat(
        pickQuotes(transcriptWithMovements, "change", 2),
      ).slice(0, 4),
      liveNodeIds: [],
    },
    {
      id: "host-sprout-agreement",
      tier: "sprout",
      label: "Agreement as small talk",
      weight: 3,
      originSessionId: "day_1",
      essay:
        "Shared critique of capitalism and scarcity can feel deep and still stay inside familiar steps — trust-building warm-up, or stuck confirmation?",
      quoteIds: pickQuotes(transcriptWithMovements, "capital", 2),
      liveNodeIds: [],
    },
    {
      id: "host-sprout-art",
      tier: "sprout",
      label: "Dialogue as art",
      weight: 3,
      originSessionId: null,
      essay:
        "Intention woven into speech — like a fashion collection that carries purpose — without demanding that every tentative voice arrive polished.",
      quoteIds: pickQuotes(transcriptWithMovements, "art", 2),
      liveNodeIds: [],
    },
    {
      id: "host-seed-body",
      tier: "seed",
      label: "Body as instrument",
      weight: 2,
      originSessionId: null,
      essay: "Listening for bodily signals among the noise — one input alongside words, status, fatigue, and habit.",
      quoteIds: pickQuotes(transcriptWithMovements, "feel", 2),
      liveNodeIds: [],
    },
  ],
  vines: [
    { id: "hv1", sourceId: "host-seed-body", targetId: "host-theme-contact", kind: "grows_into" },
    { id: "hv2", sourceId: "host-sprout-agreement", targetId: "host-theme-aporia", kind: "relates_to" },
    { id: "hv3", sourceId: "host-sprout-art", targetId: "host-theme-signal", kind: "grows_into" },
    { id: "hv4", sourceId: "host-theme-threshold", targetId: "host-theme-contact", kind: "grows_into" },
    { id: "hv5", sourceId: "host-theme-presence", targetId: "host-theme-action", kind: "grows_into" },
    { id: "hv6", sourceId: "host-theme-signal", targetId: "host-theme-aporia", kind: "relates_to" },
    { id: "hv7", sourceId: "host-theme-contact", targetId: "host-theme-action", kind: "grows_into" },
  ],
};

await writeJson(join(publicArchiveDir, "host-seeded-map.json"), hostMap);

// Harvest: glossary, tensions, facilitation
const glossary = [
  {
    id: "g-signal",
    term: "Signal",
    definition: "What deserves attention — news, speech, or sensation that carries meaning for the group.",
    quoteIds: pickQuotes(transcriptWithMovements, "matter", 2),
  },
  {
    id: "g-noise",
    term: "Noise",
    definition: "Words or interruptions that fill the air without moving meaning between people (host judgment, held lightly).",
    quoteIds: pickQuotes(transcriptWithMovements, "noise", 2),
  },
  {
    id: "g-aporia",
    term: "Aporia",
    definition: "A shared state of not-knowing — slowing down so new edges can appear.",
    quoteIds: pickQuotes(transcriptWithMovements, "question", 2),
  },
  {
    id: "g-threshold",
    term: "Threshold",
    definition: "The designed entrance: seed-pebble, silence, listening before speaking.",
    quoteIds: pickQuotes(transcriptWithMovements, "listen", 2),
  },
  {
    id: "g-contact",
    term: "Contact",
    definition: "Speaking into the shared middle while staying in relationship — like contact improv.",
    quoteIds: pickQuotes(transcriptWithMovements, "together", 2),
  },
  {
    id: "g-garden",
    term: "Garden",
    definition: "Both the room upstairs and the digital map of ideas growing across the weekend.",
    quoteIds: pickQuotes(transcriptWithMovements, "garden", 2),
  },
  {
    id: "g-inquiry",
    term: "Live inquiry",
    definition: "A question put on the TVs that carved a section of dialogue.",
    quoteIds: [],
  },
  {
    id: "g-hybrid",
    term: "Hybrid mode",
    definition: "AI proposes garden nodes; hosts approve before anything is public — captions never wait on AI.",
    quoteIds: [],
  },
];

await writeJson(join(publicArchiveDir, "glossary.json"), { entries: glossary });

const tensions = [
  {
    id: "t1",
    a: "Deep agreement",
    b: "Exploring a new edge",
    note: "Familiar shared critique can build trust — and can also keep the room from aporia.",
    quoteIds: pickQuotes(transcriptWithMovements, "agree", 2),
  },
  {
    id: "t2",
    a: "Individual report",
    b: "Collective contact",
    note: "Solutions-mode and monologue vs speaking into what is present between us.",
    quoteIds: pickQuotes(transcriptWithMovements, "I think", 2),
  },
  {
    id: "t3",
    a: "Imagining futures",
    b: "Grounding in the present",
    note: "Festival name pulls forward; presence may be the skill that makes future-talk actionable.",
    quoteIds: pickQuotes(transcriptWithMovements, "future", 2),
  },
  {
    id: "t4",
    a: "Clear intention in every sentence",
    b: "Room for tentative voices",
    note: "Dialogue-as-art without policing the shy plantings a garden needs.",
    quoteIds: pickQuotes(transcriptWithMovements, "speak", 2),
  },
  {
    id: "t5",
    a: "Resonance in the room",
    b: "Structure for action",
    note: "Feeling aligned is not the same as deciding, assigning roles, and following up.",
    quoteIds: pickQuotes(transcriptWithMovements, "action", 2),
  },
];

await writeJson(join(publicArchiveDir, "tensions.json"), { pairs: tensions });

console.log(
  `Archive built: ${transcriptWithMovements.length} public segments (dropped ${dropped}), ${movements.length} movements, ${aiNodes.length} AI nodes.`,
);
console.log(`Next: npm run archive:enrich  (needs OPENAI_API_KEY for semantic titles, summaries, AI map, phrases)`);
console.log(`Public JSON → ${publicArchiveDir}`);
console.log(`Private raw → ${privateDir}`);

/** Short idea label from an inquiry — keep the meaning, drop trailing ? */
function ideaLabel(body) {
  const cleaned = body.replace(/\?+$/, "").trim();
  if (cleaned.length <= 48) return cleaned;
  return cleaned.slice(0, 45).replace(/\s+\S*$/, "") + "…";
}

function pickQuotes(segments, needle, n) {
  const lower = needle.toLowerCase();
  return segments
    .filter((s) => s.text.toLowerCase().includes(lower))
    .slice(0, n)
    .map((s) => s.id);
}
