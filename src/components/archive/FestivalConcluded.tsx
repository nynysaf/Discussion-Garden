import Link from "next/link";

type Props = {
  formerRole: string;
};

/** Shown on old festival TV / phone routes after the weekend. */
export function FestivalConcluded({ formerRole }: Props) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-festival-forest">
        We Create Our Futures · Oct 17–18, 2026
      </p>
      <h1 className="mt-2 font-display text-5xl font-bold uppercase tracking-[0.05em]">
        Festival concluded
      </h1>
      <p className="mt-4 text-lg opacity-80">
        This URL was the {formerRole} during the live Discussion Garden. The weekend is over —
        captions, audience sharing, and AI synthesis are turned off so API keys stay safe.
      </p>
      <p className="mt-3 text-lg opacity-80">
        The public archive is ready: explore the garden of ideas, the AI reading, and a
        carefully redacted transcript.
      </p>
      <Link
        href="/explore"
        className="mt-8 inline-flex w-fit rounded-full bg-festival-forest px-6 py-3 font-semibold text-festival-cream shadow-poster transition hover:opacity-90"
      >
        Explore the garden
      </Link>
      <Link href="/" className="mt-4 text-festival-denim underline-offset-4 hover:underline">
        Back to the story
      </Link>
    </main>
  );
}
