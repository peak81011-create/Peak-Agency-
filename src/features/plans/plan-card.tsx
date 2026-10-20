import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PlanView } from "./present";

/** Carte d'offre (maquette Pricing) ; `action` = bouton « Choisir ». */
export function PlanCard({ plan, featuredLabel, action }: { plan: PlanView; featuredLabel: string; action: ReactNode }) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-5 rounded-xl border px-5 py-7 md:px-7 md:py-8",
        plan.featured ? "border-primary bg-primary text-sage-100 shadow-3" : "border-border bg-card",
      )}
    >
      {plan.featured ? (
        <span className="absolute -top-3.5 left-7 rounded-full bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-accent-foreground">
          {featuredLabel}
        </span>
      ) : null}
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-[22px] font-bold [font-stretch:108%]">{plan.name}</h3>
        {plan.description ? (
          <p className={cn("text-sm", plan.featured ? "text-sage-300" : "text-muted-foreground")}>{plan.description}</p>
        ) : null}
      </div>
      <p className="flex items-baseline gap-2">
        <span className="font-display text-5xl font-extrabold leading-none [font-stretch:115%]">{plan.price}</span>
        <span className={cn("text-sm", plan.featured ? "text-sage-300" : "text-muted-foreground")}>{plan.period}</span>
      </p>
      {action}
      <ul className="flex flex-col gap-3 text-[15px]">
        {plan.includes.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <Check className={cn("mt-0.5 size-5 shrink-0", plan.featured ? "text-sage-400" : "text-forest-600")} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
