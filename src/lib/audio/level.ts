/**
 * Loudness 0–1 for a level meter, from time-domain samples in [-1, 1].
 * RMS is scaled up because normal speech sits around 0.05–0.2 RMS.
 */
export function rmsLevel(samples: ArrayLike<number>, gain = 4): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  return Math.min(1, rms * gain);
}
