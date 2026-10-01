import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { audienceUrl, displayUrl, qrShape } from "./qr";

/** Paint the path back onto a grid so we can compare it with the library's modules. */
function paint(size: number, path: string): boolean[] {
  const grid = new Array<boolean>(size * size).fill(false);
  for (const [, x, y, w] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(w); i++) grid[Number(y) * size + Number(x) + i] = true;
  }
  return grid;
}

describe("qrShape", () => {
  it("draws exactly the library's dark modules", () => {
    const url = "https://discussion-garden.example/audience";
    const { size, path } = qrShape(url);
    const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
    expect(size).toBe(modules.size);
    expect(paint(size, path)).toEqual(Array.from(modules.data, Boolean));
  });

  it("is stable for the same text", () => {
    expect(qrShape("http://localhost:3000/audience")).toEqual(qrShape("http://localhost:3000/audience"));
  });
});

describe("audienceUrl / displayUrl", () => {
  it("builds the phone link from the screen's own address", () => {
    expect(audienceUrl("https://garden.example")).toBe("https://garden.example/audience");
    expect(audienceUrl("http://192.168.1.20:3000/")).toBe("http://192.168.1.20:3000/audience");
  });

  it("prints a short, typeable address", () => {
    expect(displayUrl("https://www.garden.example/audience")).toBe("garden.example/audience");
    expect(displayUrl("http://192.168.1.20:3000/audience")).toBe("192.168.1.20:3000/audience");
  });
});
