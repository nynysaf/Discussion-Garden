import { describe, expect, it } from "vitest";
import { buildListenUrl } from "./listen-url";
import { parseDeepgramMessage } from "./parse-message";

describe("buildListenUrl", () => {
  const params = new URL(buildListenUrl()).searchParams;

  it("opts out of Deepgram model training", () => {
    expect(params.get("mip_opt_out")).toBe("true");
  });

  it("requests Nova-3 English with speakers, formatting, and interim words", () => {
    expect(params.get("model")).toBe("nova-3");
    expect(params.get("language")).toBe("en");
    expect(params.get("diarize")).toBe("true");
    expect(params.get("smart_format")).toBe("true");
    expect(params.get("interim_results")).toBe("true");
    expect(params.get("utterance_end_ms")).toBe("1500");
  });

  it("allows overrides", () => {
    const url = new URL(buildListenUrl({ utteranceEndMs: 2000 }));
    expect(url.searchParams.get("utterance_end_ms")).toBe("2000");
  });
});

describe("parseDeepgramMessage", () => {
  const results = (isFinal: boolean) =>
    JSON.stringify({
      type: "Results",
      is_final: isFinal,
      channel: {
        alternatives: [
          {
            transcript: "hello there",
            words: [
              { word: "hello", punctuated_word: "Hello", start: 0.5, end: 0.9, speaker: 1 },
              { word: "there", punctuated_word: "there.", start: 1.0, end: 1.3, speaker: 1 },
            ],
          },
        ],
      },
    });

  it("converts words to milliseconds with punctuation and speaker", () => {
    const event = parseDeepgramMessage(results(true));
    expect(event).toEqual({
      kind: "results",
      isFinal: true,
      words: [
        { text: "Hello", startMs: 500, endMs: 900, speaker: 1, isFinal: true },
        { text: "there.", startMs: 1000, endMs: 1300, speaker: 1, isFinal: true },
      ],
    });
  });

  it("marks interim results", () => {
    const event = parseDeepgramMessage(results(false));
    expect(event.kind === "results" && event.isFinal).toBe(false);
  });

  it("defaults missing speaker to 0 and skips blank words", () => {
    const event = parseDeepgramMessage(
      JSON.stringify({
        type: "Results",
        is_final: true,
        channel: { alternatives: [{ words: [{ word: "hi", start: 0, end: 0.2 }, { word: " " }] }] },
      }),
    );
    expect(event).toMatchObject({ kind: "results", words: [{ text: "hi", speaker: 0 }] });
  });

  it("recognizes UtteranceEnd", () => {
    expect(parseDeepgramMessage('{"type":"UtteranceEnd"}')).toEqual({
      kind: "utterance-end",
    });
  });

  it("ignores metadata and malformed messages", () => {
    expect(parseDeepgramMessage('{"type":"Metadata"}').kind).toBe("ignored");
    expect(parseDeepgramMessage("not json").kind).toBe("ignored");
  });
});
