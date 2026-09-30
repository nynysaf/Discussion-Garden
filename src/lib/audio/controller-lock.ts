export const MIC_CONTROLLER_LOCK = "discussion-garden-mic-controller";

/**
 * Claim the "mic controller" role so only one tab in this browser streams
 * audio. Returns a release function, or null if another tab already holds
 * it. Cross-device exclusivity needs the database (later phase).
 */
export async function acquireControllerLock(): Promise<(() => void) | null> {
  if (typeof navigator === "undefined" || !navigator.locks) {
    return () => {};
  }

  return new Promise((resolve) => {
    navigator.locks
      .request(MIC_CONTROLLER_LOCK, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(null);
          return undefined;
        }
        return new Promise<void>((release) => resolve(() => release()));
      })
      .catch(() => resolve(null));
  });
}
