import { BarChart3, Clock, Eye, Radio, ShieldCheck, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { forAudience, getFaq } from "@/features/faq/queries";
import { BeforeAfter, ClippingExplainer, FaqPreview, OffersBubbles, WhyClips } from "@/features/public/blocks";
import { Logo3D } from "@/components/three/logo-3d";
import { Section, SectionTitle } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { getSessionUser } from "@/lib/auth/session";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { fillVars } from "@/lib/content/vars";
import { localizedPath } from "@/lib/public-paths";

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
const WHO = ["streamers", "podcasts", "youtubers", "experts"] as const;
const TIMELINE = ["day0", "day1", "day2", "week1", "month1"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("creators");
  return { title: t("meta"), description: t("hero.lead") };
}

export default async function CreatorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, user, commitments, faq] = await Promise.all([getTranslations("creators"), getSessionUser(), getCommitments(), getFaq(locale)]);
  const vars = commitmentVars(commitments, locale);
  const promises = PROMISES.map((k) => fillVars(t.raw(`promises.items.${k}`) as string, vars)).filter((x): x is string => !!x);
  const pricing = localizedPath("/pricing", locale);
  const help = localizedPath("/help", locale);

  return (
    <>
      <section className="overflow-hidden bg-forest-900 text-sage-100">
        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-14 md:px-8 md:py-24">
          <Logo3D height={260} tone="sage" className="absolute right-12 top-1/2 hidden -translate-y-1/2 lg:inline-block" />
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

      <ClippingExplainer tone="paper" />

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

      <WhyClips tone="light" />

      <Section tone="paper">
        <SectionTitle eyebrow={t("who.eyebrow")} title={t("who.title")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHO.map((k) => (
            <div key={k} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold">{t(`who.items.${k}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`who.items.${k}.body`)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionTitle eyebrow={t("timeline.eyebrow")} title={t("timeline.title")} lead={t("timeline.lead")} />
        <ol className="relative flex flex-col gap-6 border-l-2 border-primary pl-6 md:pl-8">
          {TIMELINE.map((k) => (
            <li key={k} className="relative flex flex-col gap-1">
              <span aria-hidden className="absolute -left-[33px] top-1.5 size-3.5 rounded-full border-2 border-primary bg-card md:-left-[41px]" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">{t(`timeline.items.${k}.when`)}</span>
              <h3 className="text-lg font-semibold">{t(`timeline.items.${k}.title`)}</h3>
              <p className="max-w-2xl text-muted-foreground">{t(`timeline.items.${k}.body`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <OffersBubbles user={user} />

      <BeforeAfter />

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

      <FaqPreview items={forAudience(faq, "createur").slice(0, 8)} tone="paper" />

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
