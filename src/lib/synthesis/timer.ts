/** How often Hybrid/Auto asks for new garden ideas while captions are Live. */
export const SYNTHESIS_TIMER_MS = 35_000;

export type TimerTickContext = {
  audioStatus: string;
  synthesisMode: string;
  /** True only on the tab that holds the mic controller lock. */
  holdingMic: boolean;
  /** Skip if Suggest now (or the previous tick) is still running. */
  busy: boolean;
};

/** Pure gate for the Phase 6.3 auto-suggest loop. */
export function shouldRunSynthesisTick(ctx: TimerTickContext): boolean {
  if (ctx.busy) return false;
  if (!ctx.holdingMic) return false;
  if (ctx.audioStatus !== "live") return false;
  if (ctx.synthesisMode === "manual") return false;
  return ctx.synthesisMode === "hybrid" || ctx.synthesisMode === "auto";
}
