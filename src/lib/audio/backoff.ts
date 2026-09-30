/** Reconnect delay: 1s, 2s, 4s, 8s… capped at maxMs. */
export function backoffDelayMs(
  attempt: number,
  baseMs = 1000,
  maxMs = 10000,
): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  return Math.min(maxMs, baseMs * 2 ** safeAttempt);
}
