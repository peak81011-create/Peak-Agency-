import { ArrowRight, Clock, Film, Layers, Timer, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { TransitionLink } from "@/components/transition/page-transition";
import { cn } from "@/lib/utils";
import type { PlanView } from "./present";

type Labels = {
  featured: string;
  perClip: (value: string) => string;
  clipsPerMonth: (n: number) => string;
  perDay: (n: number) => string;
  accounts: (n: number) => string;
  delivery: (n: number) => string;
  details: string;
};

/**
 * Grande « bulle » d'offre : l'essentiel en un coup d'œil, et un clic mène à la
 * page détaillée (avec la transition). `action` = bouton « Choisir cette offre ».
 */
export function OfferBubble({ plan, href, labels, action }: { plan: PlanView; href: string; labels: Labels; action: ReactNode }) {
  const dark = plan.featured;
  const muted = dark ? "text-sage-300" : "text-muted-foreground";
  const facts = [
    plan.clipsPerPeriod ? { icon: Film, text: `${labels.clipsPerMonth(plan.clipsPerPeriod)} · ${labels.perDay(Math.round(plan.clipsPerPeriod / 30))}` } : null,
    plan.clipLength ? { icon: Timer, text: plan.clipLength } : null,
    plan.accounts ? { icon: UserRound, text: labels.accounts(plan.accounts) } : null,
    plan.platforms.length ? { icon: Layers, text: plan.platforms.join(" · ") } : null,
    plan.deliveryDays ? { icon: Clock, text: labels.delivery(plan.deliveryDays) } : null,
  ].filter((f): f is { icon: typeof Film; text: string } => !!f);

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-5 rounded-[28px] border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-3 md:p-8",
        dark ? "border-primary bg-primary text-sage-100 shadow-3" : "border-border bg-card shadow-1",
      )}
      data-testid={`offer-${plan.slug ?? plan.id}`}
    >
      {plan.featured ? (
        <span className="absolute -top-3.5 left-7 rounded-full bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-accent-foreground">
          {labels.featured}
        </span>
      ) : null}
      <TransitionLink href={href} className="flex flex-col gap-5 text-inherit no-underline">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display text-[26px] font-extrabold [font-stretch:112%]">{plan.name}</h3>
          {plan.tagline ? <p className={cn("text-sm", muted)}>{plan.tagline}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-extrabold leading-none [font-stretch:115%]">{plan.price}</span>
            <span className={cn("text-sm", muted)}>{plan.period}</span>
          </p>
          {plan.perClip ? <p className={cn("text-sm font-semibold", dark ? "text-sage-200" : "text-forest-700")}>{labels.perClip(plan.perClip)}</p> : null}
        </div>
        <ul className="flex flex-col gap-2.5 text-[15px]">
          {facts.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5">
              <Icon className={cn("mt-0.5 size-[18px] shrink-0", dark ? "text-sage-400" : "text-forest-600")} aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", dark ? "text-sage-200" : "text-forest-700")}>
          {labels.details}
          <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
        </span>
      </TransitionLink>
      <div className="mt-auto">{action}</div>
    </article>
  );
}
