export const DEEPGRAM_LISTEN_URL = "wss://api.deepgram.com/v1/listen";

export type ListenOptions = {
  model: string;
  language: string;
  /** Silence (ms) after which Deepgram sends UtteranceEnd; closes a bubble. */
  utteranceEndMs: number;
};

export const DEFAULT_LISTEN_OPTIONS: ListenOptions = {
  model: "nova-3",
  language: "en",
  utteranceEndMs: 1500,
};

export function buildListenUrl(
  options: Partial<ListenOptions> = {},
): string {
  const o = { ...DEFAULT_LISTEN_OPTIONS, ...options };
  const params = new URLSearchParams({
    model: o.model,
    language: o.language,
    interim_results: "true",
    smart_format: "true",
    punctuate: "true",
    // `diarize=true` is deprecated; never send both (Deepgram rejects that).
    diarize_model: "latest",
    utterance_end_ms: String(o.utteranceEndMs),
    // Keeps Deepgram from retaining festival audio for model training.
    mip_opt_out: "true",
  });
  return `${DEEPGRAM_LISTEN_URL}?${params.toString()}`;
}
