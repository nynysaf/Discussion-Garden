/** One finished caption line as stored for the host (no audio). */
export type TranscriptLine = {
  speaker: number;
  text: string;
  startMs: number;
  createdAt: string;
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

/**
 * Plain-text transcript for one festival day. Voices stay anonymous (animal
 * labels only — never names). Sorted by start time within the day.
 */
export function formatDayTranscript(
  lines: TranscriptLine[],
  options: { daySlug: string; dayTitle?: string; exportedAt?: Date },
): string {
  const exportedAt = options.exportedAt ?? new Date();
  const header = [
    "Discussion Garden — transcript",
    `Day: ${options.dayTitle ?? options.daySlug} (${options.daySlug})`,
    `Exported: ${exportedAt.toISOString()}`,
    "Voices are labelled by garden animal only — never by name.",
    "",
  ];

  const ordered = [...lines].sort(
    (a, b) => a.startMs - b.startMs || a.createdAt.localeCompare(b.createdAt),
  );

  const body = ordered.map((line) => {
    const stamp = formatStamp(line.startMs);
    const text = line.text.trim().replace(/\s+/g, " ");
    return `[${stamp}] ${voiceLabel(line.speaker)}: ${text}`;
  });

  return [...header, ...(body.length > 0 ? body : ["(No captions saved for this day yet.)"]), ""].join(
    "\n",
  );
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
