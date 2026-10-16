/** Caption size on /captions as a percent of the default (DESIGN_GUIDE ~44–48px at 100%). */
export const FONT_SCALE_MIN = 75;
export const FONT_SCALE_MAX = 175;
export const FONT_SCALE_DEFAULT = 100;
export const FONT_SCALE_STEP = 5;

export function clampFontScale(value: number): number {
  if (!Number.isFinite(value)) return FONT_SCALE_DEFAULT;
  const stepped = Math.round(value / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, stepped));
}

/** CSS multiplier, e.g. 125 → 1.25. */
export function fontScaleFactor(percent: number): number {
  return clampFontScale(percent) / 100;
}
