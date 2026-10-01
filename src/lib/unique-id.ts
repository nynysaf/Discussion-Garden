/**
 * Random id that also works on plain-http pages (e.g. a TV opened by LAN IP), where
 * `crypto.randomUUID` is missing because it needs a secure context.
 */
export function uniqueId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
