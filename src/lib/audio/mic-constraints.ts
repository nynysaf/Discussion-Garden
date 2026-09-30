/**
 * Browser voice cleanup (noise suppression, auto volume, echo cancellation)
 * makes different people sound more alike, which hurts speaker separation.
 * Off by default; the host can turn it on for a very noisy room.
 */
export function micConstraints(
  deviceId?: string,
  voiceCleanup = false,
): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    channelCount: 1,
    echoCancellation: voiceCleanup,
    noiseSuppression: voiceCleanup,
    autoGainControl: voiceCleanup,
  };
}
