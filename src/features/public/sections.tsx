import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({ id, tone = "light", children, className }: { id?: string; tone?: "light" | "paper" | "dark" | "sage" | "mint" | "money"; children: ReactNode; className?: string }) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 py-14 md:py-24",
        tone === "paper" && "bg-paper",
        tone === "dark" && "bg-forest-900 text-sage-100",
        tone === "sage" && "bg-accent text-forest-900",
        tone === "mint" && "bg-money-50",
        tone === "money" && "bg-gradient-to-br from-money-600 to-money-700 text-white",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 md:gap-12 md:px-8">{children}</div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      {eyebrow ? (
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] opacity-80 [font-stretch:112%]">{eyebrow}</p>
      ) : null}
      <h2 className="text-balance font-display text-[34px] font-extrabold leading-[1.02] tracking-tight md:text-[52px] [font-stretch:115%]">
        {title}
      </h2>
      {lead ? <p className="text-pretty text-[17px] opacity-85 md:text-[19px]">{lead}</p> : null}
    </div>
  );
}

/** FAQ accessible sans JavaScript (details/summary). */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <details key={item.q} className="group border-b border-border-strong">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold md:text-lg [&::-webkit-details-marker]:hidden">
            {item.q}
            <Plus className="size-5 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
          </summary>
          <p className="max-w-[720px] pb-5 text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
