import Link from "next/link";
import { ArchiveNav } from "@/components/archive/ArchiveNav";
import { loadMeta } from "@/lib/archive/load";

export default function Home() {
  const meta = loadMeta();

  return (
    <main className="relative mx-auto w-full max-w-5xl px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top,_rgba(168,213,128,0.35),_transparent_60%),radial-gradient(ellipse_at_80%_20%,_rgba(238,154,35,0.18),_transparent_45%)]"
      />
      <ArchiveNav current="/" />

      <p className="mt-10 text-sm font-semibold uppercase tracking-widest text-festival-forest">
        We Create Our Futures · Oct 17 &amp; 18, 2026
      </p>
      <h1 className="mt-2 font-display text-6xl font-bold uppercase tracking-[0.05em] sm:text-7xl">
        Discussion Garden
      </h1>
      <p className="mt-4 max-w-2xl font-display text-2xl italic leading-snug sm:text-3xl">
        Twelve hours of dialogue. A garden of ideas. A question about signal and noise —
        and how a room of strangers might talk their way toward collective action.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/explore"
          className="rounded-full bg-festival-forest px-6 py-3 font-semibold text-festival-cream shadow-poster transition hover:opacity-90"
        >
          Explore the gardens
        </Link>
        <Link
          href="/explore/movements"
          className="rounded-full border border-festival-forest px-6 py-3 font-semibold text-festival-forest transition hover:bg-white/50"
        >
          Read the movements
        </Link>
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Hours of talk", value: `~${meta.hoursTalkApprox}` },
          { label: "Caption lines", value: String(meta.segmentCount) },
          { label: "Live garden plants", value: String(meta.liveGardenNodes) },
          { label: "Live inquiries", value: String(meta.inquiryCount) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-festival-green/50 bg-white/40 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-festival-forest">
              {stat.label}
            </dt>
            <dd className="mt-1 font-display text-3xl font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-16 max-w-2xl space-y-4 text-lg leading-relaxed opacity-90">
        <h2 className="font-display text-3xl font-semibold uppercase tracking-[0.04em]">
          What this archive is
        </h2>
        <p>
          Upstairs at CSI, the Discussion Garden was a practice ground for dialogue — pebble
          seeds at the threshold, silence before speech, live captions downstairs, and a digital
          garden that grew as people talked.
        </p>
        <p>
          This site is the harvest: a carefully redacted transcript, two maps of the same weekend
          (Naryan’s Map planted live, and AI’s Map of the full corpus), plus a glossary and tension
          map.
        </p>
        <p>
          Live tools that spend API credit are turned off. You can explore freely without a login.
        </p>
      </section>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {[
          {
            href: "/explore",
            title: "Explore the gardens",
            body: "Toggle Naryan’s Map and AI’s Map of the same weekend.",
          },
          {
            href: "/explore/transcript",
            title: "Redacted transcript",
            body: "Browse dialogue by day, movement, and garden-animal voice.",
          },
          {
            href: "/explore/movements",
            title: "Movements",
            body: "Sections of the weekend, each with a sense-making summary.",
          },
          {
            href: "/glossary",
            title: "Glossary & tensions",
            body: "Key concepts and productive disagreements from the room.",
          },
        ].map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="block h-full rounded-3xl border border-festival-green bg-white/60 p-6 shadow-poster transition hover:-translate-y-0.5 hover:border-festival-forest"
            >
              <span className="font-display text-2xl font-semibold">{card.title}</span>
              <span className="mt-2 block opacity-75">{card.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
