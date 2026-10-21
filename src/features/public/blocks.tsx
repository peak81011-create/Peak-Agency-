import { ArrowRight, Check, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { getVisiblePlans } from "@/features/client/queries";
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
export async function ClippingExplainer({ tone = "light" }: { tone?: "light" | "paper" }) {
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
export async function WhyClips({ tone = "paper" }: { tone?: "light" | "paper" }) {
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
export async function OffersBubbles({ user, tone = "paper" }: { user: SessionUser | null; tone?: "light" | "paper" }) {
  const locale = (await getLocale()) as Locale;
  const [t, th, plans, labels] = await Promise.all([getTranslations("offers"), getTranslations("home"), getVisiblePlans(), offerLabels()]);
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
        {views.map((p) => (
          <OfferBubble
            key={p.id}
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
