import { CalendarCheck, Compass, Rocket, Shield, TrendingUp, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { EarningsSimulator } from "@/features/clippers/earnings-simulator";
import { forAudience, getFaq } from "@/features/faq/queries";
import { FaqPreview } from "@/features/public/blocks";
import { Logo3D } from "@/components/three/logo-3d";
import { Section, SectionTitle } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { commitmentVars, currentEarningRules, getCommitments } from "@/lib/commitments";
import { fillVars } from "@/lib/content/vars";
import { localizedPath } from "@/lib/public-paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Une carte dont le texte utilise une variable non renseignée est masquée.
const REASONS = [
  { key: "noProspecting", icon: Compass },
  { key: "performance", icon: TrendingUp },
  { key: "safetyNet", icon: Shield },
  { key: "reliable", icon: Wallet },
  { key: "grow", icon: Rocket },
  { key: "free", icon: CalendarCheck },
] as const;
const PAY_ROWS = ["minimum", "bonus", "counted", "payout"] as const;
const JOIN_STEPS = ["apply", "test", "welcome"] as const;
const MISSION = ["receive", "watch", "edit", "deliver", "paid"] as const;
const LEARN = ["hooks", "rhythm", "captions", "trends"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clippers");
  return { title: t("meta"), description: t("hero.lead") };
}

export default async function ClippersPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const supabase = await createSupabaseServerClient();
  const [t, commitments, { data: levels }, faq] = await Promise.all([
    getTranslations("clippers"),
    getCommitments(),
    supabase.from("clipper_levels").select("id, name_fr, name_en, benefits_fr, benefits_en").order("sort_order"),
    getFaq(locale),
  ]);
  const vars = commitmentVars(commitments, locale);
  const fill = (key: string) => fillVars(t.raw(key as never) as string, vars);
  const reasons = REASONS.map((r) => ({ ...r, body: fill(`reasons.items.${r.key}.body`) })).filter((r) => r.body);
  const payRows = PAY_ROWS.map((k) => ({ key: k, value: fill(`pay.rows.${k}.value`) })).filter((r) => r.value);
  const rules = currentEarningRules(commitments);
  const apply = localizedPath("/clippers/apply", locale);
  const expectations = ["software", "deadlines", "charter", "age"].map((k) => fill(`expect.items.${k}`)).filter((x): x is string => !!x);

  return (
    <>
      <section className="overflow-hidden bg-forest-900 text-sage-100">
        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-14 md:px-8 md:py-24">
          <Logo3D height={260} tone="sage" className="absolute right-12 top-1/2 hidden -translate-y-1/2 lg:inline-block" />
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sage-400 [font-stretch:112%]">{t("hero.eyebrow")}</p>
          <h1 className="max-w-4xl text-balance font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-white md:text-6xl lg:text-[72px] [font-stretch:118%]">
            {t("hero.title")}
          </h1>
          <p className="max-w-2xl text-pretty text-[17px] text-sage-200 md:text-[19px]">{t("hero.lead")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={apply} className={buttonVariants({ variant: "accent", size: "lg" })}>
              {t("hero.apply")}
            </Link>
            {payRows.length ? (
              <Link href="/clippers#pay" className={buttonVariants({ variant: "on-dark", size: "lg" })}>
                {t("hero.pay")}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <Section>
        <SectionTitle eyebrow={t("reasons.eyebrow")} title={t("reasons.title")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map(({ key, icon: Icon, body }) => (
            <div key={key} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-muted text-forest-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold">{t(`reasons.items.${key}.title`)}</h3>
              <p className="text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-4">
            <SectionTitle eyebrow={t("job.eyebrow")} title={t("job.title")} />
            <p className="text-lg text-muted-foreground">{t("job.p1")}</p>
            <p className="text-muted-foreground">{t("job.p2")}</p>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-xl font-bold [font-stretch:108%]">{t("mission.title")}</h3>
            <ol className="relative flex flex-col gap-5 border-l-2 border-primary pl-6">
              {MISSION.map((k) => (
                <li key={k} className="relative flex flex-col gap-1">
                  <span aria-hidden className="absolute -left-[33px] top-1.5 size-3.5 rounded-full border-2 border-primary bg-card" />
                  <h4 className="font-semibold">{t(`mission.items.${k}.title`)}</h4>
                  <p className="text-sm text-muted-foreground">{t(`mission.items.${k}.body`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section>
        <SectionTitle eyebrow={t("learn.eyebrow")} title={t("learn.title")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEARN.map((k) => (
            <div key={k} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold">{t(`learn.items.${k}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`learn.items.${k}.body`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {payRows.length ? (
        <Section id="pay" tone="paper">
          <SectionTitle eyebrow={t("pay.eyebrow")} title={t("pay.title")} />
          <div className="grid gap-6 lg:grid-cols-2">
            <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" data-testid="pay-table">
              {payRows.map((r) => (
                <div key={r.key} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                  <dt className="text-muted-foreground">{t(`pay.rows.${r.key}.label`)}</dt>
                  <dd className="font-semibold">{r.value}</dd>
                </div>
              ))}
            </dl>
            {rules ? <EarningsSimulator rules={rules} /> : null}
          </div>
        </Section>
      ) : null}

      {levels?.length ? (
        <Section>
          <SectionTitle eyebrow={t("levels.eyebrow")} title={t("levels.title")} />
          <ol className="grid gap-4 md:grid-cols-3">
            {levels.map((l, i) => (
              <li key={l.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle-foreground">{t("levels.level", { n: i + 1 })}</span>
                <h3 className="font-display text-xl font-bold [font-stretch:110%]">{locale === "en" ? l.name_en : l.name_fr}</h3>
                <p className="text-muted-foreground">{locale === "en" ? l.benefits_en : l.benefits_fr}</p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <Section tone="dark">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <SectionTitle eyebrow={t("join.eyebrow")} title={t("join.title")} />
            <ol className="flex flex-col">
              {JOIN_STEPS.map((k, i) => (
                <li key={k} className="flex gap-5 border-t border-forest-700 py-5 last:border-b">
                  <span className="font-display text-2xl font-extrabold text-sage-400 [font-stretch:120%]">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-white">{t(`join.steps.${k}.title`)}</h3>
                    <p className="text-sage-200">{t(`join.steps.${k}.body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-2xl font-bold text-white [font-stretch:110%]">{t("expect.title")}</h3>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sage-200">
              {expectations.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <FaqPreview items={forAudience(faq, "clipper").slice(0, 8)} tab="clippers" tone="paper" />

      <Section>
        <div className="flex flex-col items-start gap-6 rounded-xl border border-border bg-card p-8 md:p-12">
          <h2 className="max-w-3xl text-balance font-display text-[30px] font-extrabold leading-[1.02] md:text-[44px] [font-stretch:115%]">{t("final.title")}</h2>
          <Link href={apply} className={buttonVariants({ size: "lg" })}>
            {t("final.cta")}
          </Link>
        </div>
      </Section>
    </>
  );
}
