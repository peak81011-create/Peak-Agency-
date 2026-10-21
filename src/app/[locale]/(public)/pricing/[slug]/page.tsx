import { CalendarClock, Clock, Film, Layers, Repeat, Timer, UserRound, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { TransitionLink } from "@/components/transition/page-transition";
import { getVisiblePlans } from "@/features/client/queries";
import { offerLabels } from "@/features/plans/offer-labels";
import { presentPlan } from "@/features/plans/present";
import { PlanCta } from "@/features/public/plan-cta";
import { Section, SectionTitle } from "@/features/public/sections";
import { initPageLocale } from "@/i18n/page";
import { getSessionUser } from "@/lib/auth/session";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { RichText } from "@/lib/content/rich-text";
import { fillVars } from "@/lib/content/vars";
import { offerPath } from "@/lib/public-paths";
import { cn } from "@/lib/utils";

async function findPlan(slug: string) {
  const plans = await getVisiblePlans();
  return { plan: plans.find((p) => p.slug === slug) ?? null, plans };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const locale = await initPageLocale(params);
  const { slug } = await params;
  const { plan } = await findPlan(slug);
  if (!plan) return {};
  const view = await presentPlan(plan, locale);
  return { title: view.name, description: view.tagline || view.description };
}

const START_STEPS = ["account", "profile", "transfer", "send"] as const;

export default async function OfferPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const locale = await initPageLocale(params);
  const { slug } = await params;
  const { plan, plans } = await findPlan(slug);
  if (!plan) notFound();
  const [t, view, user, labels, commitments] = await Promise.all([
    getTranslations("offers"),
    presentPlan(plan, locale),
    getSessionUser(),
    offerLabels(),
    getCommitments(),
  ]);
  const vars = commitmentVars(commitments, locale);
  const others = await Promise.all(plans.filter((p) => p.id !== plan.id && p.slug).map((p) => presentPlan(p, locale)));
  const perDay = view.clipsPerPeriod ? Math.round(view.clipsPerPeriod / 30) : null;

  const figures = [
    view.clipsPerPeriod ? { icon: Film, label: t("figures.clips"), value: String(view.clipsPerPeriod) } : null,
    perDay ? { icon: CalendarClock, label: t("figures.perDay"), value: `≈ ${perDay}` } : null,
    view.clipLength ? { icon: Timer, label: t("figures.length"), value: view.clipLength } : null,
    view.accounts ? { icon: UserRound, label: t("figures.accounts"), value: String(view.accounts) } : null,
    view.platforms.length ? { icon: Layers, label: t("figures.platforms"), value: view.platforms.join(" · ") } : null,
    view.deliveryDays ? { icon: Clock, label: t("figures.delivery"), value: labels.delivery(view.deliveryDays) } : null,
  ].filter((f): f is { icon: typeof Film; label: string; value: string } => !!f);

  const commitmentItems = [
    t("commitment.monthly"),
    t("commitment.transfer"),
    t("commitment.switch"),
    fillVars(t.raw("commitment.activation") as string, vars),
    fillVars(t.raw("commitment.stop") as string, vars),
  ].filter((x): x is string => !!x);

  return (
    <>
      <section className={cn(view.featured ? "bg-primary" : "bg-forest-900", "text-sage-100")}>
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end">
          <div className="flex flex-col gap-5">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sage-400 [font-stretch:112%]">{t("offerEyebrow")}</p>
            <h1 className="font-display text-[44px] font-extrabold leading-[0.98] text-white md:text-7xl [font-stretch:118%]">{view.name}</h1>
            {view.tagline ? <p className="max-w-xl text-[17px] text-sage-200 md:text-[19px]">{view.tagline}</p> : null}
          </div>
          <div className="flex flex-col gap-4 rounded-[28px] bg-forest-800/70 p-6 md:p-8">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-6xl font-extrabold leading-none text-white [font-stretch:115%]">{view.price}</span>
              <span className="text-sage-300">{view.period}</span>
            </p>
            {view.perClip ? <p className="font-semibold text-sage-200">{labels.perClip(view.perClip)}</p> : null}
            <PlanCta planId={view.id} featured user={user} label={t("signupWith", { name: view.name })} />
          </div>
        </div>
      </section>

      <Section>
        <SectionTitle eyebrow={t("figures.eyebrow")} title={t("figures.title")} />
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {figures.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-forest-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col gap-0.5">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-display text-xl font-bold [font-stretch:108%]">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        {view.includes.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {view.includes.map((i) => (
              <li key={i} className="rounded-lg bg-paper px-4 py-3 text-[15px]">
                {i}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {view.details ? (
        <Section tone="paper">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <RichText text={view.details} />
            <aside className="flex h-fit flex-col gap-4 rounded-xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold [font-stretch:108%]">
                <Wallet className="size-5 text-forest-600" aria-hidden />
                {t("commitment.title")}
              </h2>
              <ul className="flex flex-col gap-3 text-sm">
                {commitmentItems.map((c) => (
                  <li key={c} className="flex gap-2">
                    <Repeat className="mt-0.5 size-4 shrink-0 text-forest-600" aria-hidden />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </Section>
      ) : null}

      <Section>
        <SectionTitle eyebrow={t("start.eyebrow")} title={t("offerStart.title")} />
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {START_STEPS.map((k, i) => (
            <li key={k} className="flex flex-col gap-3 border-t-2 border-primary pt-6">
              <span className="font-display text-[40px] font-extrabold leading-none [font-stretch:120%]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-lg font-semibold">{t(`offerStart.steps.${k}.title`)}</h3>
              <p className="text-muted-foreground">{t(`offerStart.steps.${k}.body`)}</p>
            </li>
          ))}
        </ol>
        <div className="max-w-sm">
          <PlanCta planId={view.id} featured={false} user={user} label={t("signupWith", { name: view.name })} />
        </div>
      </Section>

      {others.length ? (
        <Section tone="paper">
          <SectionTitle eyebrow={t("others.eyebrow")} title={t("others.title")} />
          <div className="grid gap-4 md:grid-cols-3">
            {others.map((o) => (
              <TransitionLink
                key={o.id}
                href={offerPath(o.slug!, locale)}
                className="flex flex-col gap-2 rounded-[22px] border border-border bg-card p-6 text-inherit no-underline transition hover:-translate-y-0.5 hover:shadow-2"
              >
                <span className="font-display text-xl font-bold [font-stretch:110%]">{o.name}</span>
                <span className="text-sm text-muted-foreground">{o.tagline}</span>
                <span className="font-semibold">
                  {o.price} <span className="font-normal text-muted-foreground">{o.period}</span>
                </span>
              </TransitionLink>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
