import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Shared /admin look (DESIGN_GUIDE §8): one panel shell, one set of buttons, one switch.

export const input =
  "rounded-xl border border-festival-ink/20 bg-festival-cream px-3 py-2 disabled:opacity-50";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

/** Main action in a row (forest fill). */
export const primaryButton = `${base} bg-festival-forest px-4 py-1.5 text-festival-cream hover:brightness-110`;
/** Same size as primary, outlined — for the second choice next to a primary button. */
export const outlineButton = `${base} border border-festival-forest px-4 py-1.5 text-festival-forest hover:bg-festival-forest/10`;
/** Small row action (Edit, Pin, ↑). */
export const secondaryButton = `${base} border border-festival-forest px-3 py-1 text-sm text-festival-forest hover:bg-festival-forest/10`;
/** Small destructive action — always paired with a confirm. */
export const dangerButton = `${base} border border-festival-terracotta px-3 py-1 text-sm text-festival-ink hover:bg-festival-terracotta/15`;

export const errorNotice = "rounded-xl bg-festival-terracotta/15 px-4 py-2";
export const warnNotice = "rounded-xl bg-festival-marigold/25 px-4 py-2";

type PanelProps = {
  id: string;
  title: ReactNode;
  icon: LucideIcon;
  actions?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
};

/** A titled /admin section. `id` is the jump-link target from the status bar. */
export function Panel({ id, title, icon: Icon, actions, description, children }: PanelProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="@container scroll-mt-28 rounded-3xl bg-white/60 p-5 shadow-poster sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={`${id}-title`} className="flex items-center gap-3 font-display text-3xl font-semibold">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-festival-green/35 text-festival-forest">
            <Icon aria-hidden size={22} strokeWidth={1.5} />
          </span>
          {title}
        </h2>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && <div className="mt-2 text-sm opacity-75">{description}</div>}
      {children}
    </section>
  );
}

type ToggleProps = {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onClick: () => void;
  disabled?: boolean;
  /** Off is a state to notice (e.g. garden hidden, sharing paused). */
  offIsWarning?: boolean;
  ariaLabel: string;
};

/** On/off switch with the current state in words (status is never colour-only). */
export function Toggle({ on, onLabel, offLabel, onClick, disabled, offIsWarning, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        on
          ? "bg-festival-forest/10 text-festival-forest hover:bg-festival-forest/15"
          : offIsWarning
            ? "bg-festival-terracotta/20 text-festival-ink hover:bg-festival-terracotta/30"
            : "bg-festival-ink/5 text-festival-ink hover:bg-festival-ink/10"
      }`}
    >
      <span
        aria-hidden
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
          on ? "bg-festival-forest" : "bg-festival-ink/25"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-festival-cream shadow transition-transform ${
            on ? "translate-x-4" : ""
          }`}
        />
      </span>
      {on ? onLabel : offLabel}
    </button>
  );
}
