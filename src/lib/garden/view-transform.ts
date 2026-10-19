/** Pan (x, y) + scale (k) applied as `translate(x, y) scale(k)` on the garden. */

export type ViewTransform = { x: number; y: number; k: number };

export const VIEW_MIN_K = 0.25;
export const VIEW_MAX_K = 2.5;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampZoom(k: number): number {
  return clamp(k, VIEW_MIN_K, VIEW_MAX_K);
}

/**
 * Zoom so the world point under (screenX, screenY) stays under that pixel.
 * Screen coords are relative to the SVG top-left.
 */
export function zoomAroundPoint(
  view: ViewTransform,
  screenX: number,
  screenY: number,
  nextK: number,
): ViewTransform {
  const k = clampZoom(nextK);
  if (view.k === 0) return { ...view, k };
  const factor = k / view.k;
  return {
    k,
    x: screenX - (screenX - view.x) * factor,
    y: screenY - (screenY - view.y) * factor,
  };
}

/** Fit a world rectangle into a viewport with a little padding. */
export function fitView(
  worldW: number,
  worldH: number,
  viewW: number,
  viewH: number,
  padding = 40,
): ViewTransform {
  if (viewW <= 0 || viewH <= 0 || worldW <= 0 || worldH <= 0) {
    return { x: 0, y: 0, k: 1 };
  }
  const k = clampZoom(Math.min((viewW - padding * 2) / worldW, (viewH - padding * 2) / worldH));
  return {
    k,
    x: (viewW - worldW * k) / 2,
    y: (viewH - worldH * k) / 2,
  };
}
