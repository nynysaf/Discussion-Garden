import type { Garden } from "@/lib/garden/types";
import type {
  ArchiveMeta,
  ArchiveMovement,
  ArchiveSegment,
  ArchiveThemeMap,
  ArchiveWord,
  FacilitationRow,
  GlossaryEntry,
  TensionPair,
} from "./types";
import { themeMapToGarden } from "./types";

import gardenSnapshot from "@/data/archive/garden-snapshot.json";
import transcriptJson from "@/data/archive/transcript-redacted.json";
import movementsJson from "@/data/archive/movements.json";
import aiMapJson from "@/data/archive/ai-sensemaking-map.json";
import hostMapJson from "@/data/archive/host-seeded-map.json";
import wordcloudJson from "@/data/archive/wordcloud.json";
import metaJson from "@/data/archive/meta.json";
import glossaryJson from "@/data/archive/glossary.json";
import tensionsJson from "@/data/archive/tensions.json";
import facilitationJson from "@/data/archive/facilitation.json";

export function loadLiveGarden(): Garden {
  return {
    nodes: gardenSnapshot.nodes.map((n) => ({
      id: n.id,
      tier: n.tier as Garden["nodes"][number]["tier"],
      label: n.label,
      weight: n.weight,
      originSessionId: n.originSessionId,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
    vines: gardenSnapshot.vines.map((v) => ({
      id: v.id,
      sourceId: v.sourceId,
      targetId: v.targetId,
      kind: v.kind as Garden["vines"][number]["kind"],
    })),
  };
}

export function loadLiveNodeDescriptions(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of gardenSnapshot.nodes) {
    if (n.description) out[n.id] = n.description;
  }
  return out;
}

export function loadTranscript(): ArchiveSegment[] {
  return transcriptJson.segments as ArchiveSegment[];
}

export function loadMovements(): ArchiveMovement[] {
  return movementsJson.movements as ArchiveMovement[];
}

export function loadAiMap(): ArchiveThemeMap {
  return aiMapJson as ArchiveThemeMap;
}

export function loadHostMap(): ArchiveThemeMap {
  return hostMapJson as ArchiveThemeMap;
}

export function loadWordcloud(): ArchiveWord[] {
  return wordcloudJson.words as ArchiveWord[];
}

export function loadMeta(): ArchiveMeta {
  return metaJson as ArchiveMeta;
}

export function loadGlossary(): GlossaryEntry[] {
  return glossaryJson.entries as GlossaryEntry[];
}

export function loadTensions(): TensionPair[] {
  return tensionsJson.pairs as TensionPair[];
}

export function loadFacilitation(): FacilitationRow[] {
  return facilitationJson.rows as FacilitationRow[];
}

export function gardenForLayer(layer: "live" | "ai" | "host"): Garden {
  if (layer === "live") return loadLiveGarden();
  if (layer === "ai") return themeMapToGarden(loadAiMap());
  return themeMapToGarden(loadHostMap());
}

export function segmentById(): Map<string, ArchiveSegment> {
  return new Map(loadTranscript().map((s) => [s.id, s]));
}
