import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { getVisiblePlans } from "@/features/client/queries";
import { PlanCard } from "@/features/plans/plan-card";
import { presentPlan } from "@/features/plans/present";
import { PlanCta } from "@/features/public/plan-cta";
import { Faq, Section, SectionTitle } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { getSessionUser } from "@/lib/auth/session";
import { getContent, parseList } from "@/lib/content/site-content";
import { cn } from "@/lib/utils";

const KEYS = [
  "home.hero.eyebrow",
  "home.hero.title",
  "home.hero.lead",
  "home.how.title",
  "home.how.lead",
  "home.steps",
  "home.stats",
  "home.testimonials",
  "home.faq",
  "home.cta.title",
] as const;

const SERVICES = ["moments", "editing", "hooks", "accounts", "publishing", "reporting"] as const;
const CREATOR_POINTS = ["one", "two", "three", "four"] as const;
const CLIPPER_POINTS = ["one", "two", "three", "four"] as const;
const CLIPPER_STEPS = ["apply", "test", "missions"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await initPageLocale(params);
  const c = await getContent(["home.hero.title", "home.hero.lead"], locale);
  return { title: { absolute: c["home.hero.title"] }, description: c["home.hero.lead"] };
}

/** Aperçu décoratif : trois formats verticaux, sans chiffres inventés. */
function HeroVisual({ labels }: { labels: string[] }) {
  return (
    <div aria-hidden className="relative hidden h-[420px] select-none lg:block">
      {labels.map((label, i) => (
        <div
          key={label}
          className={cn(
            "absolute top-0 flex h-[360px] w-[200px] flex-col justify-between overflow-hidden rounded-[22px] border border-forest-700 bg-forest-800 p-4 shadow-3",
            i === 0 && "left-0 top-12 -rotate-6",
            i === 1 && "left-[150px] top-0 z-10",
            i === 2 && "left-[300px] top-14 rotate-6",
          )}
        >
          <span className="self-start rounded-full bg-forest-950/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-sage-200">
            {label}
          </span>
          <div className="flex flex-col gap-2">
            <span className="h-2 w-3/4 rounded-full bg-sage-400/70" />
            <span className="h-2 w-1/2 rounded-full bg-sage-500/40" />
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-1 grow rounded-full bg-sage-400" />
              <span className="h-1 w-1/3 rounded-full bg-forest-600" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, c, plans, user] = await Promise.all([getTranslations("home"), getContent(KEYS, locale), getVisiblePlans(), getSessionUser()]);
  const steps = parseList("home.steps", c["home.steps"]);
  const stats = parseList("home.stats", c["home.stats"]);
  const testimonials = parseList("home.testimonials", c["home.testimonials"]);
  const faq = parseList("home.faq", c["home.faq"]);
  const planViews = await Promise.all(plans.slice(0, 3).map((p) => presentPlan(p, locale)));

  return (
    <>
      {/* Accueil : les deux publics (créateurs et clippers) */}
      <section className="relative overflow-hidden bg-forest-900 text-sage-100">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sage-400 [font-stretch:112%]">
              {c["home.hero.eyebrow"]}
            </p>
            <h1 className="text-balance font-display text-[42px] font-extrabold leading-[0.98] tracking-tight text-white md:text-6xl lg:text-[72px] [font-stretch:118%]">
              {c["home.hero.title"]}
            </h1>
            <p className="max-w-xl text-pretty text-[17px] text-sage-200 md:text-[19px]">{c["home.hero.lead"]}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/pricing" className={buttonVariants({ variant: "accent", size: "lg" })}>
                {t("hero.creatorCta")}
              </Link>
              <Link href="/join" className={buttonVariants({ variant: "on-dark", size: "lg" })}>
                {t("hero.clipperCta")}
              </Link>
            </div>
            <p className="text-sm text-sage-400">{t("hero.platforms")}</p>
          </div>
          <HeroVisual labels={["TikTok", "Reels", "Shorts"]} />
        </div>
      </section>

      {/* Deux portes d'entrée */}
      <Section id="audiences">
        <SectionTitle eyebrow={t("audiences.eyebrow")} title={t("audiences.title")} />
        <div className="grid gap-5 md:grid-cols-2">
          <article className="flex flex-col gap-6 rounded-xl border border-border bg-card p-7 md:p-9">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle-foreground">{t("audiences.creators.label")}</p>
              <h3 className="font-display text-2xl font-bold md:text-[28px] [font-stretch:110%]">{t("audiences.creators.title")}</h3>
              <p className="text-muted-foreground">{t("audiences.creators.lead")}</p>
            </div>
            <ul className="flex flex-col gap-3">
              {CREATOR_POINTS.map((k) => (
                <li key={k} className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-forest-600" aria-hidden />
                  <span>{t(`audiences.creators.points.${k}`)}</span>
                </li>
              ))}
            </ul>
            <Link href="/pricing" className={cn(buttonVariants({ size: "lg" }), "mt-auto self-start")}>
              {t("audiences.creators.cta")}
              <ArrowRight aria-hidden />
            </Link>
          </article>
          <article className="flex flex-col gap-6 rounded-xl bg-forest-900 p-7 text-sage-100 md:p-9">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-400">{t("audiences.clippers.label")}</p>
              <h3 className="font-display text-2xl font-bold text-white md:text-[28px] [font-stretch:110%]">{t("audiences.clippers.title")}</h3>
              <p className="text-sage-200">{t("audiences.clippers.lead")}</p>
            </div>
            <ul className="flex flex-col gap-3">
              {CLIPPER_POINTS.map((k) => (
                <li key={k} className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-sage-400" aria-hidden />
                  <span>{t(`audiences.clippers.points.${k}`)}</span>
                </li>
              ))}
            </ul>
            <Link href="/join" className={cn(buttonVariants({ variant: "accent", size: "lg" }), "mt-auto self-start")}>
              {t("audiences.clippers.cta")}
              <ArrowRight aria-hidden />
            </Link>
          </article>
        </div>
      </Section>

      {/* Fonctionnement pour les créateurs (textes modifiables dans l'admin) */}
      <Section id="how" tone="paper">
        <SectionTitle eyebrow={t("howEyebrow")} title={c["home.how.title"]} lead={c["home.how.lead"]} />
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3.5 border-t-2 border-primary pt-6">
              <span className="font-display text-[44px] font-extrabold leading-none [font-stretch:120%]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Ce que l'agence prend en charge */}
      <Section>
        <SectionTitle eyebrow={t("services.eyebrow")} title={t("services.title")} lead={t("services.lead")} />
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((k) => (
            <div key={k} className="flex flex-col gap-2 bg-card p-6 md:p-7">
              <h3 className="font-semibold">{t(`services.items.${k}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`services.items.${k}.body`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {stats.length ? (
        <Section tone="sage">
          <SectionTitle eyebrow={t("statsEyebrow")} title={t("statsTitle")} />
          <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse gap-2">
                <dt className="text-sm font-medium">{s.label}</dt>
                <dd className="font-display text-[44px] font-extrabold leading-none md:text-6xl [font-stretch:120%]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {planViews.length ? (
        <Section tone="paper">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow={t("plansEyebrow")} title={t("plansTitle")} />
            <Link href="/pricing" className={buttonVariants({ variant: "secondary" })}>
              {t("plansCompare")}
            </Link>
          </div>
          <div className={cn("grid gap-6", planViews.length > 1 && "md:grid-cols-2 lg:grid-cols-3")}>
            {planViews.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                featuredLabel={t("featured")}
                action={<PlanCta planId={p.id} featured={p.featured} user={user} label={t("choose")} />}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Recrutement des clippers */}
      <Section id="clippers" tone="dark">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col items-start gap-6">
            <SectionTitle eyebrow={t("clippers.eyebrow")} title={t("clippers.title")} lead={t("clippers.lead")} />
            <Link href="/join" className={buttonVariants({ variant: "accent", size: "lg" })}>
              {t("clippers.cta")}
              <ArrowRight aria-hidden />
            </Link>
          </div>
          <ol className="flex flex-col">
            {CLIPPER_STEPS.map((k, i) => (
              <li key={k} className="flex gap-5 border-t border-forest-700 py-6 last:border-b">
                <span className="font-display text-2xl font-extrabold text-sage-400 [font-stretch:120%]">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-white">{t(`clippers.steps.${k}.title`)}</h3>
                  <p className="text-sage-200">{t(`clippers.steps.${k}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {testimonials.length ? (
        <Section>
          <SectionTitle eyebrow={t("testimonialsEyebrow")} title={t("testimonialsTitle")} />
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((q) => (
              <figure key={q.name + q.quote} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-7">
                <blockquote className="text-lg">« {q.quote} »</blockquote>
                <figcaption className="text-sm">
                  <span className="font-semibold">{q.name}</span>
                  {q.handle ? <span className="text-subtle-foreground"> · {q.handle}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      ) : null}

      {faq.length ? (
        <Section id="faq" tone="paper">
          <SectionTitle eyebrow={t("faqEyebrow")} title={t("faqTitle")} />
          <Faq items={faq} />
          <p className="text-muted-foreground">
            {t.rich("faqMore", { link: (chunks) => <Link href="/contact" className="font-semibold text-forest-700">{chunks}</Link> })}
          </p>
        </Section>
      ) : null}

      <Section>
        <div className="flex flex-col gap-8 rounded-xl border border-border bg-card p-8 md:flex-row md:items-end md:justify-between md:p-12">
          <h2 className="max-w-2xl text-balance font-display text-[32px] font-extrabold leading-[1.02] md:text-[44px] [font-stretch:115%]">
            {c["home.cta.title"]}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className={buttonVariants({ size: "lg" })}>
              {t("hero.creatorCta")}
            </Link>
            <Link href="/join" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              {t("hero.clipperCta")}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
