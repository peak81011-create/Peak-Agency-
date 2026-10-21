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
  calc: (clips: number, unit: string, total: string) => string;
};

// Un vert différent par offre, du plus clair au plus intense.
const THEMES = [
  {
    card: "border-money-100 bg-money-50 text-forest-900",
    muted: "text-text-2",
    icon: "text-money-600",
    tag: "bg-white text-money-700",
    calc: "bg-white/80 text-forest-900",
    link: "text-money-700",
    cta: "[&>a]:border-0 [&>a]:bg-money-600 [&>a]:text-white [&>a:hover]:bg-money-700",
  },
  {
    card: "border-money-600 bg-gradient-to-br from-money-500 to-money-700 text-white shadow-3",
    muted: "text-money-50",
    icon: "text-lime-200",
    tag: "bg-lime-400 text-forest-900",
    calc: "bg-white/15 text-white",
    link: "text-lime-200",
    cta: "[&>a]:border-0 [&>a]:bg-white [&>a]:text-money-700 [&>a:hover]:bg-money-50",
  },
  {
    card: "border-forest-800 bg-forest-900 text-sage-100",
    muted: "text-sage-300",
    icon: "text-money-300",
    tag: "bg-money-500 text-white",
    calc: "bg-white/10 text-sage-100",
    link: "text-money-300",
    cta: "[&>a]:border-0 [&>a]:bg-money-500 [&>a]:text-white [&>a:hover]:bg-money-600",
  },
  {
    card: "border-lime-400 bg-gradient-to-br from-lime-400 to-lime-200 text-forest-900",
    muted: "text-forest-800",
    icon: "text-forest-800",
    tag: "bg-forest-900 text-lime-400",
    calc: "bg-white/60 text-forest-900",
    link: "text-forest-900",
    cta: "[&>a]:border-0 [&>a]:bg-forest-900 [&>a]:text-white [&>a:hover]:bg-forest-700",
  },
] as const;

/**
 * Bloc d'offre : toute la carte est cliquable et mène à la page détaillée
 * (avec la transition). `action` = bouton « Démarrer » (au-dessus du lien).
 */
export function OfferBubble({
  plan,
  href,
  labels,
  action,
  index = 0,
}: {
  plan: PlanView;
  href: string;
  labels: Labels;
  action: ReactNode;
  index?: number;
}) {
  const theme = THEMES[index % THEMES.length];
  const facts = [
    plan.clipsPerPeriod ? { icon: Film, text: `${labels.clipsPerMonth(plan.clipsPerPeriod)} · ${labels.perDay(Math.round(plan.clipsPerPeriod / 30))}` } : null,
    plan.clipLength ? { icon: Timer, text: plan.clipLength } : null,
    plan.accounts ? { icon: UserRound, text: labels.accounts(plan.accounts) } : null,
    plan.platforms.length ? { icon: Layers, text: plan.platforms.join(" · ") } : null,
    plan.deliveryDays ? { icon: Clock, text: labels.delivery(plan.deliveryDays) } : null,
  ].filter((f): f is { icon: typeof Film; text: string } => !!f);

  return (
    <article
      className={cn("group relative flex flex-col gap-5 rounded-[28px] border p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-3 md:p-7", theme.card)}
      data-testid={`offer-${plan.slug ?? plan.id}`}
    >
      {plan.featured ? (
        <span className="absolute -top-3.5 left-7 rounded-full bg-lime-400 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-forest-900 shadow-1">
          {labels.featured}
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        {plan.perClip ? <span className={cn("mb-2 self-start rounded-full px-3 py-1 text-xs font-bold", theme.tag)}>{labels.perClip(plan.perClip)}</span> : null}
        {/* Lien étiré : toute la carte est cliquable */}
        <h3 className="font-display text-[26px] font-extrabold [font-stretch:112%]">
          <TransitionLink href={href} className="text-inherit no-underline after:absolute after:inset-0 after:rounded-[28px] after:content-['']">
            {plan.name}
          </TransitionLink>
        </h3>
        {plan.tagline ? <p className={cn("text-sm", theme.muted)}>{plan.tagline}</p> : null}
      </div>
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-[44px] font-extrabold leading-none tabular [font-stretch:112%]">{plan.priceCompact}</span>
          <span className={cn("text-sm", theme.muted)}>{plan.period}</span>
        </p>
        {plan.perClip && plan.clipsPerPeriod ? (
          <p className={cn("self-start rounded-lg px-3 py-1.5 text-xs font-semibold tabular", theme.calc)} data-testid="offer-calc">
            {labels.calc(plan.clipsPerPeriod, plan.perClip, plan.priceCompact)}
          </p>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2.5 text-[15px]">
        {facts.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2.5">
            <Icon className={cn("mt-0.5 size-[18px] shrink-0", theme.icon)} aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", theme.link)}>
        {labels.details}
        <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
      </span>
      <div className={cn("relative z-10 mt-auto", theme.cta)}>{action}</div>
    </article>
  );
}
