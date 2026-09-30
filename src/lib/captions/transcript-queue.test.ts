import { describe, expect, it, vi } from "vitest";
import { toBubble } from "./bubble-accumulator";
import { TranscriptQueue, toTranscriptRow } from "./transcript-queue";
import { words } from "./test-helpers";

const bubble = (sentence: string, speaker = 0, startMs = 0) =>
  toBubble("conn-1", words(sentence, speaker, startMs), true);

describe("toTranscriptRow", () => {
  it("maps a finished bubble to a database row", () => {
    const b = bubble("Hello there.", 2, 1500);
    expect(toTranscriptRow(b, "day-1")).toEqual({
      bubble_id: b.id,
      session_id: "day-1",
      connection_id: "conn-1",
      speaker: 2,
      text: "Hello there.",
      start_ms: b.startMs,
      end_ms: b.endMs,
    });
  });

  it("skips empty bubbles", () => {
    expect(toTranscriptRow({ ...bubble("Hi."), finalText: "  " }, null)).toBeNull();
  });
});

describe("TranscriptQueue", () => {
  it("saves queued rows and empties the queue", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const queue = new TranscriptQueue(save);
    queue.enqueue([bubble("One.", 0, 0), bubble("Two.", 1, 1000)], "day-1");
    expect(await queue.flush()).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toHaveLength(2);
    expect(queue.size).toBe(0);
  });

  it("keeps rows after a failed save and retries them", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const queue = new TranscriptQueue(save);
    queue.enqueue([bubble("Kept.")], null);
    expect(await queue.flush()).toBe(false);
    expect(queue.size).toBe(1);
    expect(await queue.flush()).toBe(true);
    expect(queue.size).toBe(0);
  });

  it("caps memory by dropping the oldest rows", () => {
    const queue = new TranscriptQueue(vi.fn(), 2);
    queue.enqueue([bubble("A.", 0, 0), bubble("B.", 0, 1000), bubble("C.", 0, 2000)], null);
    expect(queue.size).toBe(2);
  });

  it("does nothing when empty", async () => {
    const save = vi.fn();
    expect(await new TranscriptQueue(save).flush()).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });
});
