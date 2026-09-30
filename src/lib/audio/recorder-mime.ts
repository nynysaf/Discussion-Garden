/** Container formats Deepgram can auto-detect, in order of preference. */
export const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
] as const;

/** Returns undefined when none match; MediaRecorder then picks its default. */
export function pickRecorderMimeType(
  isTypeSupported: (type: string) => boolean,
): string | undefined {
  return RECORDER_MIME_CANDIDATES.find((type) => isTypeSupported(type));
}
