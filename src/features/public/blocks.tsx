import { ArrowRight, Check, Landmark, ShieldCheck, Smartphone, Wallet, X, Zap } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { getPublicPlans } from "@/features/plans/catalog";
import { AnswerText } from "@/features/faq/answer-text";
import type { FaqEntry } from "@/features/faq/queries";
import { OfferBubble } from "@/features/plans/offer-bubble";
import { offerLabels } from "@/features/plans/offer-labels";
import { presentPlan } from "@/features/plans/present";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { SessionUser } from "@/lib/auth/session";
import { localizedPath, offerPath } from "@/lib/public-paths";
import { cn } from "@/lib/utils";
import { PlanCta } from "./plan-cta";
import { Section, SectionTitle } from "./sections";

// Blocs de contenu partagés entre l'accueil et la page Créateurs.

/** « C'est quoi le clipping ? » : explication et schéma vidéo longue → clips. */
export async function ClippingExplainer({ tone = "light" }: { tone?: "light" | "paper" | "mint" }) {
  const t = await getTranslations("blocks.clipping");
  return (
    <Section tone={tone} id="clipping">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div className="flex flex-col gap-5">
          <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />
          <p className="text-lg text-muted-foreground">{t("p1")}</p>
          <p className="text-muted-foreground">{t("p2")}</p>
          <p className="text-muted-foreground">{t("p3")}</p>
        </div>
        <div aria-hidden className="flex flex-col gap-4 rounded-[28px] bg-forest-900 p-6 text-sage-100 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-400">{t("diagram.source")}</p>
          <div className="relative h-12 overflow-hidden rounded-md bg-forest-800">
            {[8, 22, 37, 51, 68, 83].map((left) => (
              <span key={left} className="absolute top-0 h-full w-[7%] rounded-sm bg-sage-400/80" style={{ left: `${left}%` }} />
            ))}
          </div>
          <p className="text-center text-sage-400">↓</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-400">{t("diagram.clips")}</p>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="aspect-[9/16] rounded-md border border-forest-600 bg-forest-800" />
            ))}
          </div>
          <p className="text-center text-sage-400">↓</p>
          <p className="text-center text-sm font-semibold">{t("diagram.platforms")}</p>
        </div>
      </div>
    </Section>
  );
}

/** Pourquoi les clips font grandir un créateur. */
export async function WhyClips({ tone = "paper" }: { tone?: "light" | "paper" | "mint" }) {
  const t = await getTranslations("blocks.why");
  const items = ["discovery", "chances", "lives", "regular"] as const;
  return (
    <Section tone={tone}>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((k, i) => (
          <div key={k} className="flex gap-5 rounded-xl border border-border bg-card p-6">
            <span className="font-display text-3xl font-extrabold text-forest-600 [font-stretch:120%]">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">{t(`items.${k}.title`)}</h3>
              <p className="text-muted-foreground">{t(`items.${k}.body`)}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Comparaison sans / avec l'agence. */
export async function BeforeAfter() {
  const t = await getTranslations("blocks.compare");
  const rows = ["time", "regularity", "platforms", "skills", "follow"] as const;
  return (
    <Section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 md:p-8">
          <h3 className="font-display text-xl font-bold text-muted-foreground [font-stretch:108%]">{t("without")}</h3>
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r} className="flex gap-3 text-muted-foreground">
                <X className="mt-0.5 size-5 shrink-0 text-t-red-fg" aria-hidden />
                {t(`rows.${r}.without`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4 rounded-xl bg-primary p-6 text-sage-100 md:p-8">
          <h3 className="font-display text-xl font-bold text-white [font-stretch:108%]">{t("with")}</h3>
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r} className="flex gap-3">
                <Check className="mt-0.5 size-5 shrink-0 text-sage-400" aria-hidden />
                {t(`rows.${r}.with`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/** Les offres en grandes bulles, avec lien vers le détail de chacune. */
export async function OffersBubbles({ user, tone = "light" }: { user: SessionUser | null; tone?: "light" | "paper" | "mint" }) {
  const locale = (await getLocale()) as Locale;
  const [t, th, plans, labels] = await Promise.all([getTranslations("offers"), getTranslations("home"), getPublicPlans(), offerLabels()]);
  if (!plans.length) return null;
  const views = await Promise.all(plans.slice(0, 4).map((p) => presentPlan(p, locale)));
  return (
    <Section tone={tone} id="offres">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle eyebrow={t("eyebrow")} title={t("teaserTitle")} lead={t("teaserLead")} />
        <Link href={localizedPath("/pricing", locale)} className={buttonVariants({ variant: "secondary" })}>
          {t("compareAll")}
          <ArrowRight aria-hidden />
        </Link>
      </div>
      <div className={cn("grid gap-6 pt-2", views.length > 1 && "md:grid-cols-2 xl:grid-cols-4")}>
        {views.map((p, i) => (
          <OfferBubble
            key={p.id}
            index={i}
            plan={p}
            href={p.slug ? offerPath(p.slug, locale) : localizedPath("/pricing", locale)}
            labels={labels}
            action={<PlanCta planId={p.id} featured={p.featured} user={user} label={th("choose")} />}
          />
        ))}
      </div>
    </Section>
  );
}

/** Questions fréquentes déjà ouvertes (la réponse est visible sans cliquer). */
export async function FaqPreview({ items, tone = "light", tab }: { items: FaqEntry[]; tone?: "light" | "paper"; tab?: "clippers" }) {
  const t = await getTranslations("blocks.faq");
  if (!items.length) return null;
  return (
    <Section tone={tone} id="faq">
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((q) => (
          <div key={q.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">{q.question}</h3>
            <p className="text-sm text-muted-foreground">
              <AnswerText text={q.answer} />
            </p>
          </div>
        ))}
      </div>
      <Link href={{ pathname: "/faq", query: tab ? { tab } : {} }} className={cn(buttonVariants({ variant: "secondary" }), "self-start")}>
        {t("all")}
      </Link>
    </Section>
  );
}

/** « Un clip = 0,99 € » : une vidéo longue devient des clips, chacun au même prix. */
export async function PerClipBanner() {
  const locale = (await getLocale()) as Locale;
  const [t, plans] = await Promise.all([getTranslations("money.perClip"), getPublicPlans()]);
  const views = await Promise.all(plans.filter((p) => p.clips_per_period).slice(0, 4).map((p) => presentPlan(p, locale)));
  return (
    <Section tone="dark" id="prix">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
        <div className="flex flex-col gap-5">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-lime-400 [font-stretch:112%]">{t("eyebrow")}</p>
          <h2 className="text-balance font-display text-[38px] font-extrabold leading-[1.02] tracking-tight text-white md:text-[56px] [font-stretch:115%]">
            {t("titleStart")} <span className="text-lime-400">{t("titlePrice")}</span>
          </h2>
          <p className="max-w-xl text-[17px] text-sage-200 md:text-[19px]">{t("lead")}</p>
          <ul className="grid grid-cols-2 gap-3 pt-2">
            {views.map((v) => (
              <li key={v.id} className="flex flex-col rounded-xl border border-forest-700 bg-forest-800 px-4 py-3">
                <span className="text-sm text-sage-300">{t("example", { clips: v.clipsPerPeriod ?? 0 })}</span>
                <span className="font-display text-2xl font-extrabold text-white tabular [font-stretch:112%]">{v.priceCompact}</span>
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden className="flex flex-col gap-5 rounded-[28px] bg-gradient-to-br from-money-600 to-money-700 p-6 text-white shadow-3 md:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-white/15">▶</span>
            <div className="h-3 grow overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-full bg-[repeating-linear-gradient(90deg,var(--lime-400)_0_10%,transparent_10%_16%)]" />
            </div>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-money-50">{t("video")}</p>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="relative aspect-[9/16] rounded-lg border border-white/25 bg-white/10">
                <span className="absolute inset-x-1 bottom-1.5 rounded-full bg-lime-400 py-0.5 text-center text-[11px] font-bold text-forest-900">{t("tag")}</span>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-money-50">{t("clips")}</p>
        </div>
      </div>
    </Section>
  );
}

const PAY_METHODS = [
  { key: "transfer", icon: Landmark },
  { key: "paypal", icon: Wallet },
  { key: "revolut", icon: Smartphone },
  { key: "apps", icon: Zap },
] as const;
const PAY_STEPS = ["choose", "account", "pay", "proof", "start"] as const;

/** Moyens de paiement et marche à suivre, étape par étape. */
export async function PaymentMethods() {
  const t = await getTranslations("money.pay");
  return (
    <Section tone="money" id="paiement">
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PAY_METHODS.map(({ key, icon: Icon }) => (
          <div key={key} className="flex flex-col gap-3 rounded-[22px] bg-white p-6 text-forest-900 shadow-2">
            <span className="grid size-12 place-items-center rounded-2xl bg-money-100 text-money-700">
              <Icon className="size-6" aria-hidden />
            </span>
            <h3 className="font-display text-xl font-bold [font-stretch:108%]">{t(`methods.${key}.title`)}</h3>
            <p className="text-sm text-text-2">{t(`methods.${key}.body`)}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6 rounded-[28px] bg-forest-950/25 p-6 md:p-8">
        <h3 className="font-display text-2xl font-bold [font-stretch:110%]">{t("howTitle")}</h3>
        <ol className="grid gap-5 md:grid-cols-5">
          {PAY_STEPS.map((k, i) => (
            <li key={k} className="flex flex-col gap-2">
              <span className="grid size-10 place-items-center rounded-full bg-lime-400 font-display text-lg font-extrabold text-forest-900">{i + 1}</span>
              <p className="font-semibold">{t(`steps.${k}.title`)}</p>
              <p className="text-sm text-money-50">{t(`steps.${k}.body`)}</p>
            </li>
          ))}
        </ol>
        <p className="flex items-start gap-2 text-sm text-money-50">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-lime-400" aria-hidden />
          {t("note")}
        </p>
      </div>
    </Section>
  );
}
