/** Pan (x, y) + scale (k) applied as `translate(x, y) scale(k)` on the garden. */

export type ViewTransform = { x: number; y: number; k: number };

/** Match Camp-CLAI KnowledgeMap zoom clamps. */
export const VIEW_MIN_K = 0.4;
export const VIEW_MAX_K = 2.5;
/** Explore may zoom further out so Fit can show a large web without cramming the start view. */
export const EXPLORE_VIEW_MIN_K = 0.12;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampZoom(k: number, minK = VIEW_MIN_K, maxK = VIEW_MAX_K): number {
  return clamp(k, minK, maxK);
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
  minK = VIEW_MIN_K,
): ViewTransform {
  const k = clampZoom(nextK, minK);
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
  return fitBounds(0, 0, worldW, worldH, viewW, viewH, padding);
}

/**
 * Fit an axis-aligned world box into the viewport, centred.
 * Explore passes a lower minK so a spread-out graph can still be framed.
 */
export function fitBounds(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  viewW: number,
  viewH: number,
  padding = 40,
  minK = VIEW_MIN_K,
): ViewTransform {
  const worldW = maxX - minX;
  const worldH = maxY - minY;
  if (viewW <= 0 || viewH <= 0 || worldW <= 0 || worldH <= 0) {
    return { x: 0, y: 0, k: 1 };
  }
  const k = clampZoom(
    Math.min((viewW - padding * 2) / worldW, (viewH - padding * 2) / worldH),
    minK,
  );
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    k,
    x: viewW / 2 - cx * k,
    y: viewH / 2 - cy * k,
  };
}
