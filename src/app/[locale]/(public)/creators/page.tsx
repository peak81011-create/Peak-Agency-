import { BarChart3, Clock, Eye, Radio, ShieldCheck, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { getVisiblePlans } from "@/features/client/queries";
import { PlanCard } from "@/features/plans/plan-card";
import { presentPlan } from "@/features/plans/present";
import { PlanCta } from "@/features/public/plan-cta";
import { Section, SectionTitle } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { getSessionUser } from "@/lib/auth/session";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { fillVars } from "@/lib/content/vars";
import { localizedPath } from "@/lib/public-paths";
import { cn } from "@/lib/utils";

const BENEFITS = [
  { key: "visibility", icon: Eye },
  { key: "lives", icon: Radio },
  { key: "followers", icon: UserPlus },
  { key: "time", icon: Clock },
  { key: "control", icon: ShieldCheck },
  { key: "results", icon: BarChart3 },
] as const;
const STEPS = ["plan", "send", "create", "follow"] as const;
const PROMISES = ["contact", "response", "image", "privacy"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("creators");
  return { title: t("meta"), description: t("hero.lead") };
}

export default async function CreatorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, plans, user, commitments] = await Promise.all([getTranslations("creators"), getVisiblePlans(), getSessionUser(), getCommitments()]);
  const vars = commitmentVars(commitments, locale);
  const planViews = await Promise.all(plans.slice(0, 3).map((p) => presentPlan(p, locale)));
  const promises = PROMISES.map((k) => fillVars(t.raw(`promises.items.${k}`) as string, vars)).filter((x): x is string => !!x);
  const pricing = localizedPath("/pricing", locale);
  const help = localizedPath("/help", locale);

  return (
    <>
      <section className="bg-forest-900 text-sage-100">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-14 md:px-8 md:py-24">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sage-400 [font-stretch:112%]">{t("hero.eyebrow")}</p>
          <h1 className="max-w-4xl text-balance font-display text-[42px] font-extrabold leading-[0.98] tracking-tight text-white md:text-6xl lg:text-[72px] [font-stretch:118%]">
            {t("hero.title")}
          </h1>
          <p className="max-w-2xl text-pretty text-[17px] text-sage-200 md:text-[19px]">{t("hero.lead")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={pricing} className={buttonVariants({ variant: "accent", size: "lg" })}>
              {t("hero.plans")}
            </Link>
            <Link href={help} className={buttonVariants({ variant: "on-dark", size: "lg" })}>
              {t("hero.question")}
            </Link>
          </div>
        </div>
      </section>

      <Section>
        <SectionTitle eyebrow={t("benefits.eyebrow")} title={t("benefits.title")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ key, icon: Icon }) => (
            <div key={key} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-muted text-forest-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold">{t(`benefits.items.${key}.title`)}</h3>
              <p className="text-muted-foreground">{t(`benefits.items.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="paper" id="how">
        <SectionTitle eyebrow={t("how.eyebrow")} title={t("how.title")} />
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((k, i) => (
            <li key={k} className="flex flex-col gap-3 border-t-2 border-primary pt-6">
              <span className="font-display text-[40px] font-extrabold leading-none [font-stretch:120%]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-lg font-semibold">{t(`how.steps.${k}.title`)}</h3>
              <p className="text-muted-foreground">{t(`how.steps.${k}.body`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {planViews.length ? (
        <Section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow={t("plans.eyebrow")} title={t("plans.title")} />
            <Link href={pricing} className={buttonVariants({ variant: "secondary" })}>
              {t("plans.compare")}
            </Link>
          </div>
          <div className={cn("grid gap-6", planViews.length > 1 && "md:grid-cols-2 lg:grid-cols-3")}>
            {planViews.map((p) => (
              <PlanCard key={p.id} plan={p} featuredLabel={t("plans.featured")} action={<PlanCta planId={p.id} featured={p.featured} user={user} label={t("plans.choose")} />} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section tone="paper">
        <SectionTitle eyebrow={t("promises.eyebrow")} title={t("promises.title")} />
        <ul className="grid gap-3 md:grid-cols-2">
          {promises.map((p) => (
            <li key={p} className="rounded-lg border border-border bg-card px-5 py-4 font-medium">
              {p}
            </li>
          ))}
        </ul>
        <p className="max-w-2xl text-muted-foreground">{t("promises.honest")}</p>
      </Section>

      <Section tone="dark">
        <div className="flex flex-col items-start gap-6">
          <h2 className="max-w-3xl text-balance font-display text-[32px] font-extrabold leading-[1.02] text-white md:text-[48px] [font-stretch:115%]">{t("final.title")}</h2>
          <div className="flex flex-wrap gap-3">
            <Link href={pricing} className={buttonVariants({ variant: "accent", size: "lg" })}>
              {t("hero.plans")}
            </Link>
            <Link href={help} className={buttonVariants({ variant: "on-dark", size: "lg" })}>
              {t("final.talk")}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
