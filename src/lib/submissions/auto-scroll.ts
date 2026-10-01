export type ScrollPhase = "hold-top" | "scrolling" | "hold-bottom";

export type AutoScrollState = { phase: ScrollPhase; offset: number; heldMs: number };

export type AutoScrollOptions = { speedPxPerSec: number; holdTopMs: number; holdBottomMs: number };

/** Slow enough to read from the back of the room. */
export const AUTO_SCROLL: AutoScrollOptions = {
  speedPxPerSec: 24,
  holdTopMs: 10_000,
  holdBottomMs: 6_000,
};

export const AUTO_SCROLL_START: AutoScrollState = { phase: "hold-top", offset: 0, heldMs: 0 };

/**
 * One animation frame of the room-feed scroll: hold at the top, scroll down,
 * hold at the bottom, then return to the top. `maxOffset` is how far the list
 * overflows its box; nothing moves when it fits.
 */
export function stepAutoScroll(
  state: AutoScrollState,
  dtMs: number,
  maxOffset: number,
  options: AutoScrollOptions = AUTO_SCROLL,
): AutoScrollState {
  if (maxOffset <= 0) return AUTO_SCROLL_START;
  const dt = Math.max(0, dtMs);

  switch (state.phase) {
    case "hold-top": {
      const heldMs = state.heldMs + dt;
      return heldMs >= options.holdTopMs
        ? { phase: "scrolling", offset: 0, heldMs: 0 }
        : { phase: "hold-top", offset: 0, heldMs };
    }
    case "scrolling": {
      const offset = state.offset + (options.speedPxPerSec * dt) / 1000;
      return offset >= maxOffset
        ? { phase: "hold-bottom", offset: maxOffset, heldMs: 0 }
        : { phase: "scrolling", offset, heldMs: 0 };
    }
    case "hold-bottom": {
      const heldMs = state.heldMs + dt;
      return heldMs >= options.holdBottomMs
        ? AUTO_SCROLL_START
        : { phase: "hold-bottom", offset: Math.min(state.offset, maxOffset), heldMs };
    }
  }
}
