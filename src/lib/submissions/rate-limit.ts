export type RateRule = { max: number; windowMs: number };

export type RateDecision = { allowed: true } | { allowed: false; retryAfterSec: number };

/** Per phone: a short burst is fine, a steady stream is not. */
export const DEVICE_RULES: RateRule[] = [
  { max: 3, windowMs: 60_000 },
  { max: 12, windowMs: 60 * 60_000 },
];

/** Everyone together — stops a cookie-clearing script from burying the host queue. */
export const FLOOD_RULES: RateRule[] = [{ max: 60, windowMs: 60_000 }];

/** The longest window any rule looks back over (how far back to query). */
export function lookbackMs(rules: RateRule[]): number {
  return Math.max(...rules.map((r) => r.windowMs));
}

/**
 * Would one more submission break a rule, given earlier submission times (ms)?
 * `retryAfterSec` is when enough old submissions age out of the window.
 */
export function checkRateLimit(
  timestamps: number[],
  now: number,
  rules: RateRule[],
): RateDecision {
  let waitMs = 0;
  for (const rule of rules) {
    const inWindow = timestamps
      .filter((t) => t > now - rule.windowMs && t <= now)
      .sort((a, b) => a - b);
    if (inWindow.length >= rule.max) {
      const freesAt = inWindow[inWindow.length - rule.max] + rule.windowMs;
      waitMs = Math.max(waitMs, freesAt - now);
    }
  }
  return waitMs > 0
    ? { allowed: false, retryAfterSec: Math.max(1, Math.ceil(waitMs / 1000)) }
    : { allowed: true };
}
