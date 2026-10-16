/**
 * Scale live-inquiry type to the length of the text: roomier when short,
 * tighter when long so it still fits a TV line or Highlight block.
 */

export function inquiryLengthBucket(text: string): "short" | "medium" | "long" | "xl" {
  const n = text.trim().length;
  if (n <= 48) return "short";
  if (n <= 96) return "medium";
  if (n <= 140) return "long";
  return "xl";
}

/** Footer / strip sizing (Both · Captions). */
export const INQUIRY_FOOTER_CLASS: Record<ReturnType<typeof inquiryLengthBucket>, string> = {
  short: "text-[clamp(1.55rem,2.6vw,3.2rem)]",
  medium: "text-[clamp(1.25rem,2.1vw,2.6rem)]",
  long: "text-[clamp(1.05rem,1.7vw,2.1rem)]",
  xl: "text-[clamp(0.95rem,1.35vw,1.65rem)]",
};

/** Full-screen Highlight sizing. */
export const INQUIRY_HIGHLIGHT_CLASS: Record<ReturnType<typeof inquiryLengthBucket>, string> = {
  short: "text-[clamp(2.8rem,6vw,8rem)]",
  medium: "text-[clamp(2.2rem,4.8vw,6.2rem)]",
  long: "text-[clamp(1.8rem,3.8vw,4.8rem)]",
  xl: "text-[clamp(1.4rem,2.8vw,3.6rem)]",
};
