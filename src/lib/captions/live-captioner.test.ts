import { describe, expect, it, vi } from "vitest";
import { INSECURE_PAGE_MIC_MESSAGE, LiveCaptioner } from "./live-captioner";

describe("LiveCaptioner.start", () => {
  it("explains the problem when the page has no mic API (plain-http network address)", async () => {
    vi.stubGlobal("navigator", {});
    const onStatus = vi.fn();
    const getToken = vi.fn();
    const captioner = new LiveCaptioner({ getToken, onStatus, onBubbles: vi.fn() });

    await captioner.start();

    expect(onStatus).toHaveBeenLastCalledWith("error", INSECURE_PAGE_MIC_MESSAGE);
    expect(getToken).not.toHaveBeenCalled();
    expect(captioner.hasMic).toBe(false);
    vi.unstubAllGlobals();
  });
});
