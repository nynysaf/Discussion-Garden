import Link from "next/link";

const LINKS = [
  { href: "/", label: "Story" },
  { href: "/explore", label: "Explore" },
  { href: "/explore/transcript", label: "Transcript" },
  { href: "/explore/words", label: "Words" },
  { href: "/explore/movements", label: "Movements" },
  { href: "/glossary", label: "Glossary" },
  { href: "/tensions", label: "Tensions" },
] as const;

export function ArchiveNav({ current }: { current?: string }) {
  return (
    <nav
      aria-label="Archive"
      className="flex flex-wrap gap-x-4 gap-y-2 border-b border-festival-green/60 pb-4 text-sm font-semibold"
    >
      {LINKS.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "text-festival-forest underline decoration-2 underline-offset-4"
                : "text-festival-denim hover:text-festival-forest"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
