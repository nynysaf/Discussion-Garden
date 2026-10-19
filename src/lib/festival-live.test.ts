import { afterEach, describe, expect, it } from "vitest";
import { isFestivalLive } from "./festival-live";

describe("isFestivalLive", () => {
  const previous = process.env.FESTIVAL_LIVE;

  afterEach(() => {
    if (previous === undefined) delete process.env.FESTIVAL_LIVE;
    else process.env.FESTIVAL_LIVE = previous;
  });

  it("is off when unset (archive / portfolio default)", () => {
    delete process.env.FESTIVAL_LIVE;
    expect(isFestivalLive()).toBe(false);
  });

  it("is off when explicitly false", () => {
    process.env.FESTIVAL_LIVE = "false";
    expect(isFestivalLive()).toBe(false);
  });

  it("is on only when true", () => {
    process.env.FESTIVAL_LIVE = "true";
    expect(isFestivalLive()).toBe(true);
  });
});
