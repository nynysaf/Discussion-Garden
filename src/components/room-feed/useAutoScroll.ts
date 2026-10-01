"use client";

import { useEffect, type RefObject } from "react";
import { AUTO_SCROLL_START, stepAutoScroll } from "@/lib/submissions/auto-scroll";

const MAX_FRAME_MS = 250;
const RETURN_TRANSITION = "transform 1.2s var(--ease-garden)";

/**
 * Slowly scrolls `list` inside `box` when it overflows (see `stepAutoScroll`).
 * Writes the transform directly so TV devices don't re-render React every frame.
 * Changing `resetKey` (e.g. a new message) starts again from the top.
 */
export function useAutoScroll(
  box: RefObject<HTMLElement | null>,
  list: RefObject<HTMLElement | null>,
  resetKey: string,
) {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let state = AUTO_SCROLL_START;
    let last = performance.now();
    let frameId = 0;

    const frame = (now: number) => {
      const boxEl = box.current;
      const listEl = list.current;
      if (boxEl && listEl) {
        if (reduceMotion.matches) {
          state = AUTO_SCROLL_START;
          listEl.style.transition = "";
          listEl.style.transform = "";
        } else {
          const overflow = listEl.offsetHeight - boxEl.clientHeight;
          state = stepAutoScroll(state, Math.min(now - last, MAX_FRAME_MS), overflow);
          listEl.style.transition = state.phase === "hold-top" ? RETURN_TRANSITION : "none";
          listEl.style.transform = `translate3d(0, ${-Math.round(state.offset)}px, 0)`;
        }
      }
      last = now;
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [box, list, resetKey]);
}
