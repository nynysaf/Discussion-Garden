import QRCode from "qrcode";

export type QrShape = { size: number; path: string };

/**
 * QR code as one SVG path (1 unit = 1 module, no quiet zone). Drawing it ourselves
 * lets the TV colour it with theme tokens instead of baking hex colours into an image.
 */
export function qrShape(text: string): QrShape {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const { size, data } = modules;
  let path = "";
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && data[y * size + x]) x++;
      path += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  }
  return { size, path };
}

export function audienceUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/audience`;
}

/** What to print under the code: no protocol, no "www.". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
}
