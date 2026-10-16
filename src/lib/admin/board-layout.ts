/** Movable /admin panels (Garden stays full-width below). */
export type BoardPanelId =
  | "captions"
  | "tv"
  | "schedule"
  | "drafts"
  | "inquiry"
  | "audience";

export type BoardColumn = "left" | "right";

export type BoardLayout = {
  left: BoardPanelId[];
  right: BoardPanelId[];
};

export const BOARD_STORAGE_KEY = "dg-admin-board-layout";

/** Default: Live Captions + TV + Schedule on the left; AI drafts + Live question + Audience on the right. */
export const DEFAULT_BOARD_LAYOUT: BoardLayout = {
  left: ["captions", "tv", "schedule"],
  right: ["drafts", "inquiry", "audience"],
};

const ALL_IDS: readonly BoardPanelId[] = [
  "captions",
  "tv",
  "schedule",
  "drafts",
  "inquiry",
  "audience",
];

function isPanelId(value: unknown): value is BoardPanelId {
  return typeof value === "string" && (ALL_IDS as readonly string[]).includes(value);
}

/** Accept a stored layout only when every panel appears exactly once. */
export function parseBoardLayout(raw: string | null): BoardLayout {
  if (!raw) return { ...DEFAULT_BOARD_LAYOUT, left: [...DEFAULT_BOARD_LAYOUT.left], right: [...DEFAULT_BOARD_LAYOUT.right] };
  try {
    const parsed = JSON.parse(raw) as { left?: unknown; right?: unknown };
    const left = Array.isArray(parsed.left) ? parsed.left.filter(isPanelId) : [];
    const right = Array.isArray(parsed.right) ? parsed.right.filter(isPanelId) : [];
    const seen = new Set<BoardPanelId>([...left, ...right]);
    if (seen.size !== ALL_IDS.length || left.length + right.length !== ALL_IDS.length) {
      return { left: [...DEFAULT_BOARD_LAYOUT.left], right: [...DEFAULT_BOARD_LAYOUT.right] };
    }
    return { left, right };
  } catch {
    return { left: [...DEFAULT_BOARD_LAYOUT.left], right: [...DEFAULT_BOARD_LAYOUT.right] };
  }
}

/** Remove a panel from wherever it is, then insert it into `toColumn` at `toIndex`. */
export function movePanel(
  layout: BoardLayout,
  panelId: BoardPanelId,
  toColumn: BoardColumn,
  toIndex: number,
): BoardLayout {
  const left = layout.left.filter((id) => id !== panelId);
  const right = layout.right.filter((id) => id !== panelId);
  const target = toColumn === "left" ? left : right;
  const index = Math.max(0, Math.min(toIndex, target.length));
  target.splice(index, 0, panelId);
  return { left, right };
}
