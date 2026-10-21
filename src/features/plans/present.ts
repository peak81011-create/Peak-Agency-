import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/format";
import type { PlanRow } from "@/features/client/queries";

// Mise en forme d'une offre pour l'affichage (vitrine, choix d'offre, admin).
export type PlanView = {
  id: string;
  name: string;
  description: string;
  price: string;
  period: string;
  includes: string[];
  featured: boolean;
  demo: boolean;
  slug: string | null;
  tagline: string;
  clipLength: string;
  details: string;
  /** Prix par clip (« 0,99 € »), si le nombre de clips est connu. */
  perClip: string | null;
  clipsPerPeriod: number | null;
  accounts: number | null;
  platforms: string[];
  deliveryDays: number | null;
};

export async function presentPlan(plan: PlanRow, locale: Locale, priceCents?: number): Promise<PlanView> {
  const t = await getTranslations({ locale, namespace: "plans" });
  const includes: string[] = [];
  if (plan.clips_per_period != null) includes.push(t("clips", { count: plan.clips_per_period }));
  if (plan.accounts_included != null) includes.push(t("accounts", { count: plan.accounts_included }));
  if (plan.platforms.length) includes.push(plan.platforms.map((p) => t(`platformNames.${p}` as never)).join(", "));
  if (plan.delivery_days != null) includes.push(t("delivery", { count: plan.delivery_days }));
  const clipLength = locale === "en" ? plan.clip_length_en : plan.clip_length_fr;
  if (clipLength) includes.push(t("clipLength", { length: clipLength }));
  includes.push(...(locale === "en" ? plan.features_en : plan.features_fr));
  return {
    id: plan.id,
    name: locale === "en" ? plan.name_en : plan.name_fr,
    description: locale === "en" ? plan.description_en : plan.description_fr,
    price: formatMoney(priceCents ?? plan.price_cents, plan.currency, locale),
    period: t(`periods.${plan.billing_period}`),
    includes,
    featured: plan.is_featured,
    demo: plan.is_demo,
    slug: plan.slug,
    tagline: locale === "en" ? plan.tagline_en : plan.tagline_fr,
    clipLength,
    details: locale === "en" ? plan.details_en : plan.details_fr,
    perClip: plan.clips_per_period ? formatMoney(Math.round((priceCents ?? plan.price_cents) / plan.clips_per_period), plan.currency, locale) : null,
    clipsPerPeriod: plan.clips_per_period,
    accounts: plan.accounts_included,
    platforms: plan.platforms.map((p) => t(`platformNames.${p}` as never)),
    deliveryDays: plan.delivery_days,
  };
}
