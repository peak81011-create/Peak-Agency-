import type { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="auth-title"
      className="flex w-full max-w-[440px] flex-col gap-5 rounded-lg border border-border bg-card px-5 py-7 shadow-2 md:rounded-xl md:px-8 md:py-9"
    >
      <div className="flex flex-col gap-2">
        <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-subtle-foreground [font-stretch:112%]">
          {eyebrow}
        </span>
        <h1 id="auth-title" className="font-display text-[26px] font-bold leading-tight tracking-tight md:text-3xl [font-stretch:110%]">
          {title}
        </h1>
        {lead ? <p className="text-[13px] text-muted-foreground">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}
