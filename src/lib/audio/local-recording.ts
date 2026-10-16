/** Build a downloadable WebM from MediaRecorder chunks (host laptop only). */
export function webmFilename(daySlug: string | null, at: Date = new Date()): string {
  const day = (daySlug ?? "session").replace(/[^\w.-]+/g, "_");
  const stamp = at.toISOString().slice(0, 19).replace(/[:T]/g, (c) => (c === "T" ? "-" : "-"));
  return `discussion-garden-${day}-${stamp}.webm`;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function chunksToWebm(chunks: Blob[], mimeType: string): Blob | null {
  if (chunks.length === 0) return null;
  return new Blob(chunks, { type: mimeType || "audio/webm" });
}
