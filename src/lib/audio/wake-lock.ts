/**
 * Keeps the host laptop's screen awake while captions are live. Browsers
 * release the lock whenever the tab is hidden, so callers re-request it
 * when the tab becomes visible again.
 */
export function isScreenWakeLockSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "wakeLock" in navigator &&
    typeof navigator.wakeLock?.request === "function"
  );
}

export async function requestScreenWakeLock(): Promise<WakeLockSentinel | null> {
  if (!isScreenWakeLockSupported()) return null;
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}
