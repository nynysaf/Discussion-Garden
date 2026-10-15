import { describe, expect, it } from "vitest";
import { pickView, startRotation, stopRotation, toggleInRotation } from "./screen-control";

const NOW = "2026-10-17T15:00:00.000Z";

describe("screen control patches", () => {
  it("picking a view only changes the view when not rotating", () => {
    expect(pickView("garden", false, NOW)).toEqual({ captionsLayout: "garden" });
  });
  it("picking a view while rotating restarts the cycle from it", () => {
    expect(pickView("highlight", true, NOW)).toEqual({ captionsLayout: "highlight", captionsRotateSince: NOW });
  });
  it("starting rotation anchors on the view shown now and clamps seconds", () => {
    expect(startRotation("captions", 5, NOW)).toEqual({
      captionsLayout: "captions",
      captionsRotateSeconds: 10,
      captionsRotateSince: NOW,
    });
  });
  it("stopping rotation stays on the view shown now", () => {
    expect(stopRotation("highlight")).toEqual({
      captionsLayout: "highlight",
      captionsRotateSeconds: null,
      captionsRotateSince: null,
    });
  });
  it("toggling a view keeps canonical order", () => {
    expect(toggleInRotation(["garden", "captions"], "both", "garden", false, NOW)).toEqual({
      captionsRotation: ["garden", "both", "captions"],
    });
    expect(toggleInRotation(["garden", "captions"], "garden", "garden", false, NOW)).toEqual({
      captionsRotation: ["captions"],
    });
  });
  it("toggling while rotating restarts from the view shown now", () => {
    expect(toggleInRotation(["garden", "both"], "highlight", "both", true, NOW)).toEqual({
      captionsRotation: ["garden", "both", "highlight"],
      captionsLayout: "both",
      captionsRotateSince: NOW,
    });
  });
});
