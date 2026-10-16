/**
 * /captions screen views (DESIGN_GUIDE §5.1a–b). Pure helpers shared by the TV and /admin,
 * so both always agree on what the TV is showing right now.
 */

export type CaptionsView = "garden" | "both" | "captions" | "highlight";

/** Canonical order — also the order auto-rotate steps through. */
export const CAPTIONS_VIEWS: CaptionsView[] = ["garden", "both", "captions", "highlight"];

export const VIEW_LABELS: Record<CaptionsView, string> = {
  garden: "Garden",
  both: "Both",
  captions: "Captions",
  highlight: "Highlight",
};

export const ROTATE_MIN_SECONDS = 10;
export const ROTATE_MAX_SECONDS = 120;
export const ROTATE_DEFAULT_SECONDS = 20;

export function isCaptionsView(value: unknown): value is CaptionsView {
  return CAPTIONS_VIEWS.includes(value as CaptionsView);
}

/** Keeps valid, unique views in canonical order. */
export function cleanRotation(values: readonly unknown[] | null | undefined): CaptionsView[] {
  const set = new Set((values ?? []).filter(isCaptionsView));
  return CAPTIONS_VIEWS.filter((v) => set.has(v));
}

export function clampRotateSeconds(value: number): number {
  if (!Number.isFinite(value)) return ROTATE_DEFAULT_SECONDS;
  return Math.min(ROTATE_MAX_SECONDS, Math.max(ROTATE_MIN_SECONDS, Math.round(value)));
}

export type ViewSettings = {
  selected: CaptionsView;
  rotation: CaptionsView[];
  /** null = auto-rotate off */
  rotateSeconds: number | null;
  /** ISO time auto-rotate was (re)started from `selected` */
  rotateSince: string | null;
};

export type ViewContext = {
  gardenHidden: boolean;
  /** Something is live on the TVs (Highlight only then — not "coming up"). */
  hasHighlight: boolean;
};

/** Views that make sense right now: no garden views while it's hidden, no empty Highlight. */
export function availableViews({ gardenHidden, hasHighlight }: ViewContext): CaptionsView[] {
  return CAPTIONS_VIEWS.filter((view) => {
    if (gardenHidden && (view === "garden" || view === "both")) return false;
    if (!hasHighlight && view === "highlight") return false;
    return true;
  });
}

/** The selected view, or the nearest sensible stand-in when it isn't available. */
export function effectiveView(selected: CaptionsView, context: ViewContext): CaptionsView {
  if (availableViews(context).includes(selected)) return selected;
  return context.gardenHidden ? "captions" : "both";
}

type Rotation = { playlist: CaptionsView[]; start: number; elapsedMs: number; periodMs: number };

function activeRotation(nowMs: number, settings: ViewSettings, context: ViewContext): Rotation | null {
  if (!settings.rotateSeconds || !settings.rotateSince) return null;
  const available = availableViews(context);
  const playlist = settings.rotation.filter((v) => available.includes(v));
  if (playlist.length < 2) return null;
  const sinceMs = Date.parse(settings.rotateSince);
  if (Number.isNaN(sinceMs)) return null;
  // Start from the selected view, or the next ticked view after it in canonical order.
  const order = CAPTIONS_VIEWS.indexOf(settings.selected);
  const startAt = playlist.findIndex((v) => CAPTIONS_VIEWS.indexOf(v) >= order);
  return {
    playlist,
    start: startAt === -1 ? 0 : startAt,
    elapsedMs: Math.max(0, nowMs - sinceMs),
    periodMs: clampRotateSeconds(settings.rotateSeconds) * 1000,
  };
}

/** What the TV shows at `nowMs`. */
export function currentView(nowMs: number, settings: ViewSettings, context: ViewContext): CaptionsView {
  const rotation = activeRotation(nowMs, settings, context);
  if (!rotation) return effectiveView(settings.selected, context);
  const { playlist, start, elapsedMs, periodMs } = rotation;
  const steps = Math.floor(elapsedMs / periodMs);
  return playlist[(start + steps) % playlist.length];
}

/** Seconds until auto-rotate moves on, and to which view; null when it isn't rotating. */
export function nextRotation(
  nowMs: number,
  settings: ViewSettings,
  context: ViewContext,
): { inSeconds: number; view: CaptionsView } | null {
  const rotation = activeRotation(nowMs, settings, context);
  if (!rotation) return null;
  const { playlist, start, elapsedMs, periodMs } = rotation;
  const steps = Math.floor(elapsedMs / periodMs);
  return {
    inSeconds: Math.ceil((periodMs - (elapsedMs % periodMs)) / 1000),
    view: playlist[(start + steps + 1) % playlist.length],
  };
}

/** Garden/caption split for the middle band; Highlight covers the whole screen instead. */
export type BandLayout = Exclude<CaptionsView, "highlight">;

/** Share of the band width each panel gets. */
export function bandShare(layout: BandLayout): { garden: number; captions: number } {
  if (layout === "garden") return { garden: 1, captions: 0 };
  if (layout === "captions") return { garden: 0, captions: 1 };
  return { garden: 0.58, captions: 0.42 };
}

/** Band layout to keep underneath Highlight: the last one shown, if it still makes sense. */
export function bandUnder(view: CaptionsView, lastBand: BandLayout, context: ViewContext): BandLayout {
  if (view !== "highlight") return view;
  return effectiveView(lastBand, context) as BandLayout;
}

/** Which layout each panel's *content* is sized for (it can lag the visible slide). */
export type ContentFit = { garden: BandLayout; captions: BandLayout };

const CONTENT_SIZE = {
  garden: (l: BandLayout) => (l === "garden" ? 1 : 0.58),
  captions: (l: BandLayout) => (l === "captions" ? 1 : 0.42),
};

/**
 * A panel that is shrinking re-fits at the start of the slide; one that is growing re-fits
 * after it — so content never spills outside its panel mid-slide, and the garden and
 * bubbles re-layout once per change rather than every frame. A panel sliding out of view
 * keeps its old fit.
 */
export function refitPlan(current: ContentFit, band: BandLayout): { now: ContentFit; afterSlide: ContentFit } {
  const share = bandShare(band);
  const now = { ...current };
  const afterSlide = { ...current };
  for (const panel of ["garden", "captions"] as const) {
    if (share[panel] === 0) continue;
    afterSlide[panel] = band;
    if (CONTENT_SIZE[panel](band) <= CONTENT_SIZE[panel](current[panel])) now[panel] = band;
  }
  return { now, afterSlide };
}
