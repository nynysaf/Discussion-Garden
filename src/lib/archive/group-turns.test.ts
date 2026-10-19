import { describe, expect, it } from "vitest";
import { groupConsecutiveTurns } from "./group-turns";
import type { ArchiveSegment } from "./types";

function seg(partial: Partial<ArchiveSegment> & Pick<ArchiveSegment, "id" | "voice" | "text">): ArchiveSegment {
  return {
    day: "day_1",
    clock: "00:00",
    ...partial,
  };
}

describe("groupConsecutiveTurns", () => {
  it("joins consecutive same-voice lines", () => {
    const turns = groupConsecutiveTurns([
      seg({ id: "a", voice: "Frog", text: "Hello." }),
      seg({ id: "b", voice: "Frog", text: "How are you?" }),
      seg({ id: "c", voice: "Bird", text: "Fine." }),
      seg({ id: "d", voice: "Frog", text: "Good." }),
    ]);
    expect(turns).toHaveLength(3);
    expect(turns[0]?.text).toBe("Hello. How are you?");
    expect(turns[0]?.segmentIds).toEqual(["a", "b"]);
    expect(turns[1]?.voice).toBe("Bird");
    expect(turns[2]?.text).toBe("Good.");
  });
});
