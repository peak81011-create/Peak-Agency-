import { ArrowRight, Clapperboard, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Section, SectionTitle } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { getContent, parseList } from "@/lib/content/site-content";
import { fillVars } from "@/lib/content/vars";
import { localizedPath } from "@/lib/public-paths";
import { cn } from "@/lib/utils";

const KEYS = ["home.hero.eyebrow", "home.hero.title", "home.hero.lead", "home.stats"] as const;
const STEPS = ["one", "two", "three"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await initPageLocale(params);
  const c = await getContent(["home.hero.title", "home.hero.lead"], locale);
  return { title: { absolute: c["home.hero.title"] }, description: c["home.hero.lead"] };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, c, commitments] = await Promise.all([getTranslations("home"), getContent(KEYS, locale), getCommitments()]);
  const stats = parseList("home.stats", c["home.stats"]);
  const responseLine = fillVars(t.raw("questions.response") as string, commitmentVars(commitments, locale));

  return (
    <>
      <section className="bg-forest-900 text-sage-100">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pb-14 pt-14 md:px-8 md:pb-20 md:pt-20">
          {c["home.hero.eyebrow"] ? (
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sage-400 [font-stretch:112%]">{c["home.hero.eyebrow"]}</p>
          ) : null}
          <h1 className="max-w-4xl text-balance font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-white md:text-6xl lg:text-[72px] [font-stretch:118%]">
            {c["home.hero.title"]}
          </h1>
          <p className="max-w-2xl text-pretty text-[17px] text-sage-200 md:text-[19px]">{c["home.hero.lead"]}</p>
        </div>
      </section>

      {/* Deux portes d'entrée */}
      <section className="bg-forest-900 pb-14 md:pb-24">
        <div className="mx-auto grid w-full max-w-[1200px] gap-4 px-4 md:grid-cols-2 md:gap-6 md:px-8">
          <Link
            href={localizedPath("/creators", locale)}
            className="group flex flex-col gap-4 rounded-xl bg-paper p-7 text-foreground no-underline shadow-2 transition hover:-translate-y-0.5 md:p-9"
            data-testid="door-creator"
          >
            <Sparkles className="size-7 text-forest-600" aria-hidden />
            <h2 className="font-display text-[28px] font-extrabold leading-tight md:text-[34px] [font-stretch:112%]">{t("doors.creator.title")}</h2>
            <p className="text-muted-foreground md:text-lg">{t("doors.creator.body")}</p>
            <span className={cn(buttonVariants({ size: "lg" }), "mt-auto self-start")}>
              {t("doors.creator.cta")}
              <ArrowRight className="transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
          <Link
            href="/clippers"
            className="group flex flex-col gap-4 rounded-xl border border-forest-700 bg-forest-800 p-7 text-sage-100 no-underline shadow-2 transition hover:-translate-y-0.5 md:p-9"
            data-testid="door-clipper"
          >
            <Clapperboard className="size-7 text-sage-400" aria-hidden />
            <h2 className="font-display text-[28px] font-extrabold leading-tight text-white md:text-[34px] [font-stretch:112%]">{t("doors.clipper.title")}</h2>
            <p className="text-sage-200 md:text-lg">{t("doors.clipper.body")}</p>
            <span className={cn(buttonVariants({ variant: "accent", size: "lg" }), "mt-auto self-start")}>
              {t("doors.clipper.cta")}
              <ArrowRight className="transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </div>
      </section>

      <Section id="how">
        <SectionTitle eyebrow={t("how.eyebrow")} title={t("how.title")} />
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((k, i) => (
            <li key={k} className="flex flex-col gap-3 border-t-2 border-primary pt-6">
              <span className="font-display text-[40px] font-extrabold leading-none [font-stretch:120%]">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-lg font-semibold">{t(`how.steps.${k}`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Chiffres saisis par l'admin ; bloc masqué tant que la liste est vide */}
      {stats.length ? (
        <Section tone="sage">
          <SectionTitle eyebrow={t("stats.eyebrow")} title={t("stats.title")} />
          <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse gap-2">
                <dt className="text-sm font-medium">{s.label}</dt>
                <dd className="font-display text-[40px] font-extrabold leading-none md:text-6xl [font-stretch:120%]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      <Section tone="paper">
        <div className="flex flex-col items-start gap-3">
          <h2 className="font-display text-2xl font-bold md:text-3xl [font-stretch:110%]">{t("questions.title")}</h2>
          <p className="text-muted-foreground">
            {t.rich("questions.body", {
              faq: (chunks) => (
                <Link href="/faq" className="font-semibold text-forest-700">
                  {chunks}
                </Link>
              ),
              contact: (chunks) => (
                <Link href={localizedPath("/help", locale)} className="font-semibold text-forest-700">
                  {chunks}
                </Link>
              ),
            })}{" "}
            {responseLine}
          </p>
        </div>
      </Section>
    </>
  );
}
