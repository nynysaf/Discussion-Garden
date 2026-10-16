/** One finished caption line as stored for the host (no audio). */
export type TranscriptLine = {
  speaker: number;
  text: string;
  startMs: number;
  createdAt: string;
};

/** When a live inquiry was put on the TVs (wall-clock). */
export type TranscriptInquiryMark = {
  body: string;
  activatedAt: string;
};

const VOICE_LABELS = [
  "Frog",
  "Bird",
  "Ladybug",
  "Butterfly",
  "Bee",
  "Caterpillar",
  "Hedgehog",
  "Snail",
  "Owl",
  "Rabbit",
  "Turtle",
  "Squirrel",
];

export function voiceLabel(speaker: number): string {
  const index = ((speaker % VOICE_LABELS.length) + VOICE_LABELS.length) % VOICE_LABELS.length;
  return VOICE_LABELS[index];
}

type TimelineRow =
  | { kind: "inquiry"; at: string; body: string }
  | { kind: "caption"; at: string; startMs: number; speaker: number; text: string };

/**
 * Plain-text transcript for one festival day. Voices stay anonymous (animal
 * labels only — never names). Live inquiries are inserted as section markers
 * by wall-clock time so they carve up the conversation.
 */
export function formatDayTranscript(
  lines: TranscriptLine[],
  options: {
    daySlug: string;
    dayTitle?: string;
    exportedAt?: Date;
    inquiries?: TranscriptInquiryMark[];
  },
): string {
  const exportedAt = options.exportedAt ?? new Date();
  const header = [
    "Discussion Garden — transcript",
    `Day: ${options.dayTitle ?? options.daySlug} (${options.daySlug})`,
    `Exported: ${exportedAt.toISOString()}`,
    "Voices are labelled by garden animal only — never by name.",
    "Lines starting with --- mark when a live inquiry was put on the TVs.",
    "",
  ];

  const timeline: TimelineRow[] = [
    ...(options.inquiries ?? []).map((mark) => ({
      kind: "inquiry" as const,
      at: mark.activatedAt,
      body: mark.body.trim().replace(/\s+/g, " "),
    })),
    ...lines.map((line) => ({
      kind: "caption" as const,
      at: line.createdAt,
      startMs: line.startMs,
      speaker: line.speaker,
      text: line.text.trim().replace(/\s+/g, " "),
    })),
  ];

  timeline.sort((a, b) => {
    const byTime = a.at.localeCompare(b.at);
    if (byTime !== 0) return byTime;
    if (a.kind !== b.kind) return a.kind === "inquiry" ? -1 : 1;
    if (a.kind === "caption" && b.kind === "caption") return a.startMs - b.startMs;
    return 0;
  });

  const body = timeline.map((row) => {
    if (row.kind === "inquiry") return `--- Live inquiry: ${row.body} ---`;
    return `[${formatStamp(row.startMs)}] ${voiceLabel(row.speaker)}: ${row.text}`;
  });

  const empty =
    body.length === 0 ? ["(No captions or live inquiries saved for this day yet.)"] : body;

  return [...header, ...empty, ""].join("\n");
}

export function transcriptFilename(daySlug: string, at: Date = new Date()): string {
  const safe = daySlug.replace(/[^\w.-]+/g, "_");
  const stamp = at.toISOString().slice(0, 19).replace(/[:T]/g, (c) => (c === "T" ? "-" : "-"));
  return `discussion-garden-${safe}-${stamp}.txt`;
}

function formatStamp(startMs: number): string {
  const totalSec = Math.max(0, Math.floor(startMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
