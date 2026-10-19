import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const recordingsDir = join(root, "Recordings & Transcripts");
export const privateDir = join(root, "scripts/archive/private");
export const publicArchiveDir = join(root, "src/data/archive");

const LINE_RE = /^\[(\d+:\d{2}(?::\d{2})?)\]\s+([A-Za-z]+):\s*(.*)$/;
const INQUIRY_RE = /^---\s*Live inquiry:\s*(.+?)\s*---\s*$/i;

/** Main festival day files (skip the tiny Friday test export). */
export const DAY_FILES = {
  day_1: "discussion-garden-day_1-2026-10-17-21-10-42.txt",
  day_2: "discussion-garden-day_2-2026-10-18-21-32-41.txt",
};

export async function ensureDirs() {
  await mkdir(privateDir, { recursive: true });
  await mkdir(publicArchiveDir, { recursive: true });
}

export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function parseTranscriptText(text, day) {
  const segments = [];
  const inquiries = [];
  let segIndex = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const inquiry = line.match(INQUIRY_RE);
    if (inquiry) {
      inquiries.push({
        id: `${day}-inq-${inquiries.length + 1}`,
        day,
        body: inquiry[1].trim(),
        afterSegmentIndex: segIndex - 1,
      });
      continue;
    }

    const m = line.match(LINE_RE);
    if (!m) continue;
    const [, clock, voice, body] = m;
    const cleaned = body.trim();
    if (!cleaned) continue;
    // Drop obvious mic tests at the very start
    segments.push({
      id: `${day}-s${String(segIndex + 1).padStart(4, "0")}`,
      day,
      voice,
      clock,
      text: cleaned,
      index: segIndex,
    });
    segIndex += 1;
  }

  return { segments, inquiries };
}

export async function loadDayFiles() {
  const out = {};
  for (const [day, name] of Object.entries(DAY_FILES)) {
    const path = join(recordingsDir, name);
    const text = await readFile(path, "utf8");
    out[day] = parseTranscriptText(text, day);
  }
  return out;
}

/** Common given names / festival people spotted in exports — replace with [Name]. */
export const NAME_PATTERNS = [
  /\bNaryan\b/gi,
  /\bNarayan\b/gi,
  /\bCandice\b/gi,
  /\bAlex\b/gi,
  /\bEva\b/gi,
  /\bJames\b/gi,
  /\bSonya\b/gi,
  /\bSonia\b/gi,
  /\bJess\b/gi,
  /\bMegan\b/gi,
  /\bMeghan\b/gi,
  /\bHellstrom\b/gi,
  /\bHelfstein\b/gi,
  /\bBen\b/gi,
  /\bJenny\b/gi,
  /\bJoyce\b/gi,
  /\bDavid\b/gi,
  /\bLacy\b/gi,
  /\bLacey\b/gi,
  /\bWill\b/gi,
  /\bJohn Martin\b/gi,
  /\bLiyoshi\b/gi,
];

const SENSITIVE_RE =
  /\b(uncle|accident|trauma|suicide|abuse|assault|diagnos|neurodiverg|in my sevent|password|address)\b/i;

export function redactText(text) {
  let out = text;
  for (const re of NAME_PATTERNS) {
    out = out.replace(re, "[Name]");
  }
  // Collapse repeated [Name] [Name]
  out = out.replace(/(\[Name\]\s*){2,}/g, "[Name] ");
  return out.trim();
}

export function shouldDropSegment(text) {
  const t = text.toLowerCase();
  if (/^(test\.?|testing\.?|one, two, three\.?|here we go\.?)$/i.test(text.trim())) return true;
  if (SENSITIVE_RE.test(text)) return true;
  if (/\bi wish i was a baller\b/i.test(t)) return true; // lyric mic check
  return false;
}

const PAST_RE =
  /\b(was|were|used to|grew up|remember|yesterday|last year|in the past|when i was|back then|history|childhood)\b/i;
const FUTURE_RE =
  /\b(will|would|going to|gonna|future|someday|imagine|what if|next year|descendants|hope to|we could)\b/i;
const PRESENT_RE =
  /\b(now|here|this moment|present|feeling|i notice|in this room|right now|currently|today)\b/i;

export function codeAttention(text) {
  const past = PAST_RE.test(text);
  const future = FUTURE_RE.test(text);
  const present = PRESENT_RE.test(text);
  const n = [past, future, present].filter(Boolean).length;
  if (n === 0) return "unclear";
  if (n > 1) return "mixed";
  if (past) return "past";
  if (future) return "future";
  return "present";
}

const CONTACT_RE =
  /\b(what i hear|building on|you said|us|we together|in the middle|curious|i wonder|question for|listening)\b/i;
const NOISE_RE =
  /\b(anyway|whatever|you know what i mean|blah|random|side note)\b/i;

export function codeContact(text) {
  if (CONTACT_RE.test(text)) return "contact";
  if (NOISE_RE.test(text) || text.split(/\s+/).length > 80) return "noise";
  return "unclear";
}

const STOPWORDS = new Set(
  `a about after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with you your yours yourself yourselves like just really also get got yeah yes okay ok um uh`.split(
    /\s+/,
  ),
);

export function wordWeights(segments, limit = 80) {
  const counts = new Map();
  const hits = new Map();
  for (const seg of segments) {
    const words = seg.text
      .toLowerCase()
      .replace(/[^a-z0-9'\-\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w) && w !== "[name]");
    for (const w of words) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
      if (!hits.has(w)) hits.set(w, []);
      const list = hits.get(w);
      if (list.length < 8 && !list.includes(seg.id)) list.push(seg.id);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, weight]) => ({ term, weight, segmentIds: hits.get(term) ?? [] }));
}

export async function listRecordingTxt() {
  try {
    return await readdir(recordingsDir);
  } catch {
    return [];
  }
}
