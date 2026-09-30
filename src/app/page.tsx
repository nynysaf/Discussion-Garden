import Link from "next/link";

const VIEWS = [
  {
    href: "/admin",
    title: "Host controls",
    where: "Upstairs laptop",
    body: "Microphone, live captions, and (soon) schedule, garden, and moderation.",
  },
  {
    href: "/captions",
    title: "Captions & garden",
    where: "Downstairs TV",
    body: "Speech-bubble captions beside the growing garden.",
  },
  {
    href: "/audience",
    title: "Share a thought",
    where: "Phones (QR code)",
    body: "Send a question or reflection — no login.",
  },
  {
    href: "/room-feed",
    title: "Room feed",
    where: "Upstairs TV",
    body: "Host-approved questions from the audience.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-festival-forest">
        We Create Our Futures · Oct 17 &amp; 18
      </p>
      <h1 className="mt-2 font-display text-6xl font-bold uppercase tracking-[0.05em]">
        Discussion Garden
      </h1>
      <p className="mt-3 font-display text-2xl italic">
        Live captions and a garden of ideas, growing as we talk.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {VIEWS.map((view) => (
          <li key={view.href}>
            <Link
              href={view.href}
              className="block h-full rounded-3xl border border-festival-green bg-white/60 p-6 shadow-poster transition hover:-translate-y-0.5 hover:border-festival-forest"
            >
              <span className="text-sm font-semibold text-festival-forest">
                {view.where}
              </span>
              <span className="mt-1 block font-display text-3xl font-semibold">
                {view.title}
              </span>
              <span className="mt-2 block opacity-75">{view.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
