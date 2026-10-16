"use client";

import { useEffect, useState } from "react";
import { useNow } from "@/components/useNow";
import { useReducedMotion } from "@/components/useReducedMotion";
import {
  bandUnder,
  currentView,
  nextRotation,
  refitPlan,
  type BandLayout,
  type CaptionsView,
  type ContentFit,
  type ViewContext,
} from "@/lib/captions/layout";
import { captionsViewSettings } from "@/lib/realtime/app-state";
import type { FestivalState } from "@/lib/realtime/festival-state";
import { dayItems, nowAndNext } from "@/lib/schedule/schedule";

export const SLIDE_MS = 900;

/** Which view the TV is on right now (shared by /captions and the /admin readout). */
export function useCaptionsView(state: FestivalState) {
  const nowMs = useNow(1000);
  const { appState } = state;
  const { now, next } = nowAndNext(
    dayItems(state.schedule, appState.activeSessionId),
    appState.activeScheduleItemId,
  );
  const hasLiveInquiry = Boolean(appState.activeLiveInquiryId);
  const context = { gardenHidden: appState.gardenHidden, hasHighlight: hasLiveInquiry };
  const settings = captionsViewSettings(appState);
  return {
    nowMs,
    now,
    next,
    hasLiveInquiry,
    context,
    view: currentView(nowMs, settings, context),
    upcoming: nextRotation(nowMs, settings, context),
  };
}

/**
 * The garden/caption split under the view, plus what each panel's content is sized for.
 * `animate` is off until the screen has loaded, so a reload lands on the view without sliding.
 */
export function useBand(view: CaptionsView, context: ViewContext, animate: boolean) {
  const reduceMotion = useReducedMotion();
  const [lastBand, setLastBand] = useState<BandLayout>("both");
  const band = bandUnder(view, lastBand, context);
  if (band !== lastBand) setLastBand(band);

  const [fit, setFit] = useState<ContentFit>({ garden: band, captions: band });
  const [target, setTarget] = useState<BandLayout>(band);
  const [pending, setPending] = useState<ContentFit | null>(null);
  if (target !== band) {
    const plan = refitPlan(fit, band);
    setTarget(band);
    setFit(plan.now);
    setPending(plan.afterSlide);
  }

  const delay = animate && !reduceMotion ? SLIDE_MS : 0;
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      setFit(pending);
      setPending(null);
    }, delay);
    return () => clearTimeout(timer);
  }, [pending, delay]);

  return { band, fit };
}
