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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await initPageLocale(params);
  const c = await getContent(["home.hero.title", "home.hero.lead"], locale);
  return { title: { absolute: c["home.hero.title"] }, description: c["home.hero.lead"] };
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
      <section className="bg-forest-900 text-sage-100">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-16 md:px-8 md:py-24">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sage-400 [font-stretch:112%]">
            {c["home.hero.eyebrow"]}
          </p>
          <h1 className="max-w-4xl text-balance font-display text-[42px] font-extrabold leading-[0.98] tracking-tight text-white md:text-6xl lg:text-[76px] [font-stretch:118%]">
            {c["home.hero.title"]}
          </h1>
          <p className="max-w-2xl text-pretty text-[17px] text-sage-200 md:text-[19px]">{c["home.hero.lead"]}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className={buttonVariants({ variant: "accent", size: "lg" })}>
              {t("ctaPrimary")}
            </Link>
            <Link href="/#how" className={buttonVariants({ variant: "on-dark", size: "lg" })}>
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      <Section id="how">
        <SectionTitle eyebrow={t("howEyebrow")} title={c["home.how.title"]} lead={c["home.how.lead"]} />
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3.5 border-t-2 border-primary p-0 pt-6 md:p-6">
              <span className="font-display text-[44px] font-extrabold leading-none [font-stretch:120%]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
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

      <Section tone="dark">
        <div className="flex flex-col items-start gap-6">
          <h2 className="max-w-3xl text-balance font-display text-[34px] font-extrabold leading-[1.02] text-white md:text-[52px] [font-stretch:115%]">
            {c["home.cta.title"]}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className={buttonVariants({ variant: "accent", size: "lg" })}>
              {t("ctaPrimary")}
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: "on-dark", size: "lg" })}>
              {t("ctaContact")}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
