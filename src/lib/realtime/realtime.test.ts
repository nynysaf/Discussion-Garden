import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_STATE, toAppState, toAppStatePatch } from "./app-state";
import { createRefetcher } from "./refetcher";

describe("toAppState", () => {
  it("maps database columns to the app shape", () => {
    expect(
      toAppState({
        active_session_id: "s1",
        active_schedule_item_id: "q1",
        active_live_inquiry_id: "li1",
        synthesis_mode: "hybrid",
        audio_status: "live",
        garden_hidden: true,
        speaker_colours_on: false,
        highlighted_submission_id: null,
        submissions_open: false,
        captions_layout: "highlight",
        captions_rotation: ["captions", "garden", "bogus", "garden"],
        captions_rotate_seconds: 20,
        captions_rotate_since: "2026-10-17T15:00:00Z",
        captions_font_scale: 125,
      }),
    ).toEqual({
      activeSessionId: "s1",
      activeScheduleItemId: "q1",
      activeLiveInquiryId: "li1",
      synthesisMode: "hybrid",
      audioStatus: "live",
      gardenHidden: true,
      speakerColoursOn: false,
      highlightedSubmissionId: null,
      submissionsOpen: false,
      captionsLayout: "highlight",
      captionsRotation: ["garden", "captions"],
      captionsRotateSeconds: 20,
      captionsRotateSince: "2026-10-17T15:00:00Z",
      captionsFontScale: 125,
      captionsFooter: "schedule",
    });
  });

  it("falls back to the Both view with auto-rotate off", () => {
    expect(toAppState({ captions_layout: "sideways" })).toMatchObject({
      captionsLayout: "both",
      captionsRotateSeconds: null,
      captionsRotateSince: null,
    });
  });

  it("falls back to safe defaults (boots in Manual, colours on, submissions open)", () => {
    expect(toAppState(null)).toEqual(DEFAULT_APP_STATE);
    expect(toAppState({ synthesis_mode: "turbo", audio_status: "??" })).toMatchObject({
      synthesisMode: "manual",
      audioStatus: "idle",
      speakerColoursOn: true,
      submissionsOpen: true,
    });
  });
});

describe("toAppStatePatch", () => {
  it("only includes the keys provided", () => {
    expect(toAppStatePatch({ audioStatus: "paused", speakerColoursOn: true })).toEqual({
      audio_status: "paused",
      speaker_colours_on: true,
    });
    expect(toAppStatePatch({ activeSessionId: null })).toEqual({ active_session_id: null });
  });
});

describe("createRefetcher", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("collapses a burst of triggers into one fetch", async () => {
    const fetch = vi.fn().mockResolvedValue("data");
    const onData = vi.fn();
    const r = createRefetcher({ fetch, onData });
    r.trigger();
    r.trigger();
    r.trigger();
    await vi.runAllTimersAsync();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith("data");
  });

  it("ignores a slow older result that finishes after a newer one", async () => {
    const resolvers: ((v: string) => void)[] = [];
    const fetch = vi.fn(() => new Promise<string>((resolve) => resolvers.push(resolve)));
    const onData = vi.fn();
    const r = createRefetcher({ fetch, onData, debounceMs: 0 });

    r.trigger();
    await vi.runAllTimersAsync();
    r.trigger();
    await vi.runAllTimersAsync();

    resolvers[1]("new");
    resolvers[0]("old");
    await vi.runAllTimersAsync();
    expect(onData.mock.calls).toEqual([["new"]]);
  });

  it("reports errors and stops after cancel", async () => {
    const onError = vi.fn();
    const onData = vi.fn();
    const r = createRefetcher({ fetch: () => Promise.reject(new Error("offline")), onData, onError });
    r.trigger();
    await vi.runAllTimersAsync();
    expect(onError).toHaveBeenCalledTimes(1);

    r.cancel();
    r.trigger();
    await vi.runAllTimersAsync();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
