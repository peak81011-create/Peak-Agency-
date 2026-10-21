import { ArrowRight, Banknote, Layers, Play, ShieldCheck, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Logo3D } from "@/components/three/logo-3d";
import { PillLink } from "@/components/layout/header-cta";
import { buttonVariants } from "@/components/ui/button";
import { TransitionLink } from "@/components/transition/page-transition";
import { getFaq } from "@/features/faq/queries";
import { BeforeAfter, ClippingExplainer, FaqPreview, OffersBubbles, PaymentMethods, PerClipBanner, WhyClips } from "@/features/public/blocks";
import { Section, SectionTitle } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { getSessionUser } from "@/lib/auth/session";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { getContent, parseList } from "@/lib/content/site-content";
import { fillVars } from "@/lib/content/vars";
import { localizedPath } from "@/lib/public-paths";
import { cn } from "@/lib/utils";

const KEYS = ["home.hero.eyebrow", "home.hero.title", "home.hero.lead", "home.stats"] as const;
const STEPS = ["one", "two", "three"] as const;
const TRUST = [
  { key: "approval", icon: ShieldCheck },
  { key: "transfer", icon: Banknote },
  { key: "platforms", icon: Layers },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await initPageLocale(params);
  const c = await getContent(["home.hero.title", "home.hero.lead"], locale);
  return { title: { absolute: c["home.hero.title"] }, description: c["home.hero.lead"] };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, c, commitments, user, faq] = await Promise.all([
    getTranslations("home"),
    getContent(KEYS, locale),
    getCommitments(),
    getSessionUser(),
    getFaq(locale),
  ]);
  const stats = parseList("home.stats", c["home.stats"]);
  // « Phrase 1. Phrase 2. » : la seconde phrase du titre est mise en couleur.
  const title = c["home.hero.title"] || t("hero.fallbackTitle");
  const cut = title.indexOf(". ");
  const [titleStart, titleEnd] = cut > 0 ? [title.slice(0, cut + 1), title.slice(cut + 2)] : [title, ""];
  const responseLine = fillVars(t.raw("questions.response") as string, commitmentVars(commitments, locale));

  return (
    <>
      {/* Héros : en-tête centré, gros titre, un bouton principal et trois garanties */}
      <section className="peak-glow relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <span className="peak-float absolute left-[7%] top-[22%] [--tilt:0deg]">
            <Logo3D height={190} />
          </span>
          <span className="peak-float absolute right-[7%] top-[30%] grid size-24 place-items-center rounded-[24px] bg-forest-900 text-lime-400 shadow-3 [--tilt:10deg] [animation-delay:-3s]">
            <Play className="size-9 fill-current" />
          </span>
          <span className="peak-float absolute bottom-[14%] right-[16%] grid size-16 place-items-center rounded-[18px] bg-money-600 text-white shadow-2 [--tilt:-6deg] [animation-delay:-1.5s]">
            <TrendingUp className="size-7" />
          </span>
        </div>
        <div className="relative mx-auto flex w-full max-w-[1000px] flex-col items-center gap-7 px-4 pb-20 pt-16 text-center md:gap-9 md:px-8 md:pb-28 md:pt-24">
          {c["home.hero.eyebrow"] ? (
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-money-700 [font-stretch:112%]">{c["home.hero.eyebrow"]}</p>
          ) : null}
          <a href="#offres" className="rounded-full bg-money-600 px-4 py-1.5 text-sm font-bold text-white no-underline shadow-2 hover:bg-money-700">
            {t("hero.price")}
          </a>
          <h1 className="text-balance font-display text-[42px] font-extrabold leading-[1.02] tracking-tight text-forest-900 md:text-[68px] lg:text-[84px] [font-stretch:112%]">
            {titleStart}
            {titleEnd ? (
              <>
                {" "}
                <span className="bg-gradient-to-r from-money-700 via-money-600 to-money-500 bg-clip-text text-transparent">{titleEnd}</span>
              </>
            ) : null}
          </h1>
          <p className="max-w-2xl text-pretty text-[18px] text-text-2 md:text-[21px]">{c["home.hero.lead"] || t("hero.fallbackLead")}</p>
          <div className="flex flex-col items-center gap-4">
            <PillLink href={localizedPath("/creators", locale)} label={t("hero.cta")} size="lg" transition testId="door-creator" />
            <TransitionLink href="/clippers" className="font-semibold text-forest-700 underline-offset-4 hover:underline" data-testid="door-clipper">
              {t("hero.clipper")}
            </TransitionLink>
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[15px] text-text-2 md:text-base">
            {TRUST.map(({ key, icon: Icon }, i) => (
              <li key={key} className={cn("flex items-center gap-2", i > 0 && "md:border-l md:border-border-strong md:pl-6")}>
                <Icon className="size-5 text-money-600" aria-hidden />
                {t(`hero.trust.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <OffersBubbles user={user} />
      <PerClipBanner />
      <ClippingExplainer />
      <WhyClips tone="mint" />

      <Section id="how">
        <SectionTitle eyebrow={t("how.eyebrow")} title={t("how.title")} />
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((k, i) => (
            <li key={k} className="flex flex-col gap-3 border-t-4 border-money-500 pt-6">
              <span className="font-display text-[40px] font-extrabold leading-none [font-stretch:120%]">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-lg font-semibold">{t(`how.steps.${k}`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <PaymentMethods />

      <BeforeAfter />

      {/* Clippers : rejoindre l'équipe */}
      <Section tone="dark">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-4">
            <SectionTitle eyebrow={t("clipperTeaser.eyebrow")} title={t("clipperTeaser.title")} lead={t("clipperTeaser.lead")} />
            <TransitionLink href="/clippers" className={cn(buttonVariants({ variant: "accent", size: "lg" }), "self-start")}>
              {t("clipperTeaser.cta")}
              <ArrowRight aria-hidden />
            </TransitionLink>
          </div>
          <ul className="flex flex-col gap-3">
            {(["one", "two", "three"] as const).map((k) => (
              <li key={k} className="rounded-lg border border-forest-700 bg-forest-800 px-5 py-4 text-sage-100">
                {t(`clipperTeaser.points.${k}`)}
              </li>
            ))}
          </ul>
        </div>
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

      <FaqPreview items={faq.filter((f) => f.isTop).slice(0, 6)} tone="paper" />

      <Section>
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
