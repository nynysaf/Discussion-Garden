import type { ArchiveThemeMap, ArchiveThemeNode, ArchiveThemeVine } from "./types";
import type { Tier, VineKind } from "@/lib/garden/types";

const TIERS = new Set<Tier>(["theme", "sprout", "seed"]);

function slug(label: string): string {
  const s = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `naryan-${s || "node"}`;
}

function stripQuotes(label: string): string {
  return label.replace(/^["“]+|["”]+$/g, "").trim();
}

function parseQuotes(value: string): string[] {
  return value
    .split(/[, ]+/)
    .map((q) => q.trim())
    .filter(Boolean);
}

function defaultWeight(tier: Tier): number {
  if (tier === "theme") return 5;
  if (tier === "sprout") return 3;
  return 2;
}

type Draft = {
  label: string;
  tier: Tier;
  weight?: number;
  essay: string;
  quotes: string[];
  growsInto: string[];
  relatesTo: string[];
};

/**
 * Parse the beginner-friendly markdown in `src/data/archive/naryan-map.md`.
 * Each `## Heading` is a plant; `grows_into` / `relates_to` name other headings.
 */
export function parseNaryanMap(source: string): ArchiveThemeMap {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "");
  const parts = withoutComments.split(/^## /m);
  const header = parts[0] ?? "";
  const titleMatch = header.match(/^#\s+(.+)$/m);
  const captionMatch = header.match(/^caption:\s*(.+)$/m);
  const imageMatch = header.match(/^image:\s*(.+)$/m);
  const imageIntroMatch = header.match(/^imageIntro:\s*(.+)$/m);

  const drafts: Draft[] = [];
  for (const block of parts.slice(1)) {
    const lines = block.split(/\r?\n/);
    const label = stripQuotes((lines[0] ?? "").trim());
    if (!label) continue;
    const draft: Draft = {
      label,
      tier: "sprout",
      essay: "",
      quotes: [],
      growsInto: [],
      relatesTo: [],
    };
    let essayMode = false;
    for (const raw of lines.slice(1)) {
      const line = raw.trimEnd();
      const field = line.match(
        /^(tier|weight|essay|quotes|grows_into|relates_to):\s*(.*)$/,
      );
      if (field) {
        essayMode = field[1] === "essay";
        const key = field[1];
        const value = field[2].trim();
        if (key === "tier" && TIERS.has(value as Tier)) draft.tier = value as Tier;
        else if (key === "weight") draft.weight = Number(value) || draft.weight;
        else if (key === "essay") draft.essay = value;
        else if (key === "quotes") draft.quotes = parseQuotes(value);
        else if (key === "grows_into" && value) draft.growsInto.push(stripQuotes(value));
        else if (key === "relates_to" && value) draft.relatesTo.push(stripQuotes(value));
        continue;
      }
      if (essayMode && line.trim()) {
        draft.essay = [draft.essay, line.trim()].filter(Boolean).join(" ");
      }
    }
    drafts.push(draft);
  }

  const used = new Set<string>();
  const nodes: ArchiveThemeNode[] = drafts.map((d) => {
    let id = slug(d.label);
    let n = 2;
    while (used.has(id)) {
      id = `${slug(d.label)}-${n}`;
      n += 1;
    }
    used.add(id);
    return {
      id,
      tier: d.tier,
      label: d.label,
      weight: d.weight ?? defaultWeight(d.tier),
      originSessionId: null,
      essay: d.essay,
      quoteIds: d.quotes,
      liveNodeIds: [],
    };
  });

  const byLabel = new Map(nodes.map((n) => [n.label.toLowerCase(), n.id]));
  const vines: ArchiveThemeVine[] = [];
  const seen = new Set<string>();
  const link = (fromLabel: string, toLabel: string, kind: VineKind) => {
    const sourceId = byLabel.get(fromLabel.toLowerCase());
    const targetId = byLabel.get(toLabel.toLowerCase());
    if (!sourceId || !targetId || sourceId === targetId) return;
    const key = `${sourceId}|${targetId}|${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    vines.push({
      id: `naryan-vine-${vines.length + 1}`,
      sourceId,
      targetId,
      kind,
    });
  };

  for (const d of drafts) {
    for (const t of d.growsInto) link(d.label, t, "grows_into");
    for (const t of d.relatesTo) link(d.label, t, "relates_to");
  }

  return {
    layer: "host",
    title: (titleMatch?.[1] ?? "Naryan's Map").trim(),
    caption: (captionMatch?.[1] ?? "").trim(),
    image: imageMatch?.[1]?.trim(),
    imageIntro: imageIntroMatch?.[1]?.trim(),
    nodes,
    vines,
  };
}

export type LabelBridge = { from: string; to: string; kind: VineKind };

/** Add vines by plant label — used to join AI-map islands without editing every id. */
export function applyLabelBridges(map: ArchiveThemeMap, bridges: LabelBridge[]): ArchiveThemeMap {
  const byLabel = new Map(map.nodes.map((n) => [n.label.toLowerCase(), n.id]));
  const seen = new Set(map.vines.map((v) => `${v.sourceId}|${v.targetId}|${v.kind}`));
  const vines = [...map.vines];
  let extra = 0;
  for (const b of bridges) {
    const sourceId = byLabel.get(b.from.toLowerCase());
    const targetId = byLabel.get(b.to.toLowerCase());
    if (!sourceId || !targetId || sourceId === targetId) continue;
    const key = `${sourceId}|${targetId}|${b.kind}`;
    const rev = `${targetId}|${sourceId}|${b.kind}`;
    if (seen.has(key) || seen.has(rev)) continue;
    seen.add(key);
    extra += 1;
    vines.push({
      id: `bridge-${extra}`,
      sourceId,
      targetId,
      kind: b.kind,
    });
  }
  return { ...map, vines };
}
