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
  wordWeights,
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
      title: shortenTitle(inq.body),
      inquiry: inq.body,
      summary: `Live inquiry on the TVs: “${inq.body}”`,
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
      title: day === "day_1" ? "Saturday threshold & warm-up" : "Sunday arrival",
      summary: "Talk before the first live inquiry of the day.",
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
await writeJson(join(publicArchiveDir, "wordcloud.json"), {
  exportedAt: new Date().toISOString(),
  words: wordWeights(transcriptWithMovements, 100),
});

// AI sensemaking map — cluster around inquiries + high-weight terms as themes/sprouts/seeds
const aiNodes = [];
const aiVines = [];
const themeInquiries = allInquiries.slice(0, 12);
themeInquiries.forEach((inq, i) => {
  const id = `ai-theme-${i + 1}`;
  const related = transcriptWithMovements
    .filter((s) => s.text.toLowerCase().includes(inq.body.toLowerCase().slice(0, 24).split(/\s+/)[0] ?? ""))
    .slice(0, 5)
    .map((s) => s.id);
  const quotes = pickQuotes(transcriptWithMovements, inq.body, 3);
  aiNodes.push({
    id,
    tier: "theme",
    label: shortenTitle(inq.body, 6),
    weight: 3 + Math.min(4, Math.floor(quotes.length)),
    originSessionId: inq.day,
    essay: `AI reading of the inquiry “${inq.body}” across the weekend corpus — patterns near this prompt.`,
    quoteIds: quotes,
    liveNodeIds: [],
  });
});

const topWords = wordWeights(transcriptWithMovements, 24);
topWords.forEach((w, i) => {
  if (w.term.length < 5) return;
  const id = `ai-sprout-${i + 1}`;
  aiNodes.push({
    id,
    tier: i < 8 ? "sprout" : "seed",
    label: titleCase(w.term),
    weight: Math.max(1, Math.min(5, Math.round(w.weight / 8))),
    originSessionId: null,
    essay: `Recurring term in the redacted transcript (${w.weight} mentions).`,
    quoteIds: w.segmentIds.slice(0, 3),
    liveNodeIds: [],
  });
  // Vine toward nearest theme by shared day / first theme
  const theme = aiNodes.find((n) => n.tier === "theme");
  if (theme) {
    aiVines.push({
      id: `ai-vine-${aiVines.length + 1}`,
      sourceId: id,
      targetId: theme.id,
      kind: i % 3 === 0 ? "relates_to" : "grows_into",
    });
  }
});

// Connect consecutive themes
const themes = aiNodes.filter((n) => n.tier === "theme");
for (let i = 0; i < themes.length - 1; i++) {
  aiVines.push({
    id: `ai-theme-vine-${i + 1}`,
    sourceId: themes[i].id,
    targetId: themes[i + 1].id,
    kind: "relates_to",
  });
}

await writeJson(join(publicArchiveDir, "ai-sensemaking-map.json"), {
  layer: "ai",
  title: "AI sensemaking",
  caption:
    "A fresh offline reading of the full redacted corpus — clusters around live inquiries and recurring language. Provocations, not verdicts.",
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

const facilitation = allInquiries.map((inq, i) => {
  const mov = movements.find((m) => m.inquiry === inq.body);
  const n = mov?.segmentIds.length ?? 0;
  let opened = "mixed";
  if (n >= 40) opened = "opened";
  else if (n > 0 && n < 12) opened = "quiet";
  else if (n === 0) opened = "quiet";
  return {
    id: `fac-${i + 1}`,
    inquiry: inq.body,
    day: inq.day,
    opened,
    note:
      opened === "opened"
        ? "Many lines followed this inquiry on the TVs — the prompt seemed to hold space."
        : opened === "quiet"
          ? "Little talk landed after this marker (or it was posted in a cluster at day’s end)."
          : "Moderate stretch of dialogue after this inquiry.",
  };
});

await writeJson(join(publicArchiveDir, "facilitation.json"), { rows: facilitation });

console.log(
  `Archive built: ${transcriptWithMovements.length} public segments (dropped ${dropped}), ${movements.length} movements, ${aiNodes.length} AI nodes.`,
);
console.log(`Public JSON → ${publicArchiveDir}`);
console.log(`Private raw → ${privateDir}`);

function shortenTitle(body, maxWords = 6) {
  const words = body.replace(/[?].*$/, "").trim().split(/\s+/);
  const cut = words.slice(0, maxWords).join(" ");
  return cut.length > 42 ? cut.slice(0, 40) + "…" : cut;
}

function titleCase(w) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function pickQuotes(segments, needle, n) {
  const lower = needle.toLowerCase();
  return segments
    .filter((s) => s.text.toLowerCase().includes(lower))
    .slice(0, n)
    .map((s) => s.id);
}
