type Props = {
  title: string;
  phase: string;
  children?: React.ReactNode;
  className?: string;
};

export function ComingSoon({ title, phase, children, className = "" }: Props) {
  return (
    <section
      className={`rounded-3xl border-2 border-dashed border-festival-green p-6 ${className}`}
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-festival-forest">
        {phase}
      </p>
      <h2 className="mt-1 font-display text-2xl font-semibold">{title}</h2>
      {children && <div className="mt-2 opacity-75">{children}</div>}
    </section>
  );
}
