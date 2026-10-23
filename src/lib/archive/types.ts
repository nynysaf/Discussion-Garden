import type { Garden, Tier, VineKind } from "@/lib/garden/types";

/** Garden lenses. `/explore` shows Naryan's Map + AI; host JSON stays in the archive. */
export type ArchiveMapLayer = "live" | "ai" | "host" | "naryan";

export type ArchiveSegment = {
  id: string;
  day: "day_1" | "day_2";
  voice: string;
  /** Display clock from the export, e.g. "02:35" (resets when a Deepgram connection restarts). */
  clock: string;
  text: string;
  /** True when the line was cut or heavily anonymized. */
  redacted?: boolean;
  movementId?: string;
  attention?: "past" | "present" | "future" | "mixed" | "unclear";
  contact?: "contact" | "noise" | "unclear";
};

export type ArchiveInquiry = {
  id: string;
  day: "day_1" | "day_2";
  body: string;
  /** Index into segments after which this inquiry appears in the export. */
  afterSegmentIndex: number;
};

export type ArchiveMovement = {
  id: string;
  day: "day_1" | "day_2";
  title: string;
  inquiry?: string;
  summary: string;
  segmentIds: string[];
};

export type ArchiveThemeNode = {
  id: string;
  tier: Tier;
  label: string;
  weight: number;
  originSessionId: string | null;
  essay: string;
  quoteIds: string[];
  liveNodeIds?: string[];
};

export type ArchiveThemeVine = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: VineKind;
};

export type ArchiveThemeMap = {
  layer: "ai" | "host";
  title: string;
  caption: string;
  /** Optional screenshot shown under Naryan's Map. */
  image?: string;
  imageIntro?: string;
  nodes: ArchiveThemeNode[];
  vines: ArchiveThemeVine[];
};

export type ArchiveWord = {
  term: string;
  weight: number;
  segmentIds: string[];
};

export type ArchiveMeta = {
  hoursTalkApprox: number;
  segmentCount: number;
  voiceCounts: Record<string, number>;
  dayCounts: { day_1: number; day_2: number };
  inquiryCount: number;
  liveGardenNodes: number;
  liveGardenVines: number;
  attention: Record<string, number>;
  contact: Record<string, number>;
};

export type GlossaryEntry = {
  id: string;
  term: string;
  definition: string;
  quoteIds: string[];
};

export type TensionPair = {
  id: string;
  a: string;
  b: string;
  note: string;
  quoteIds: string[];
};

export type ArchiveBundle = {
  garden: Garden;
  transcript: ArchiveSegment[];
  movements: ArchiveMovement[];
  aiMap: ArchiveThemeMap;
  hostMap: ArchiveThemeMap;
  wordcloud: ArchiveWord[];
  meta: ArchiveMeta;
  glossary: GlossaryEntry[];
  tensions: TensionPair[];
};

/** Convert a theme map into the Garden shape GardenCanvas expects. */
export function themeMapToGarden(map: ArchiveThemeMap): Garden {
  return {
    nodes: map.nodes.map((n) => ({
      id: n.id,
      tier: n.tier,
      label: n.label,
      weight: n.weight,
      originSessionId: n.originSessionId,
      createdAt: "",
      updatedAt: "",
    })),
    vines: map.vines.map((v) => ({
      id: v.id,
      sourceId: v.sourceId,
      targetId: v.targetId,
      kind: v.kind,
    })),
  };
}
