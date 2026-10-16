/** Marigold pill with the host's live inquiry (or schedule Now title as a fallback). */
export function LiveQuestion({
  text,
  className = "",
}: {
  text: string | null | undefined;
  className?: string;
}) {
  if (!text) return null;
  return (
    <p
      className={`rounded-full bg-festival-marigold px-[1.2em] py-[0.4em] font-display font-semibold italic text-festival-ink ${className}`}
    >
      {text}
    </p>
  );
}
