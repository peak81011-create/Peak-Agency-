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
};

export async function presentPlan(plan: PlanRow, locale: Locale, priceCents?: number): Promise<PlanView> {
  const t = await getTranslations({ locale, namespace: "plans" });
  const includes: string[] = [];
  if (plan.clips_per_period != null) includes.push(t("clips", { count: plan.clips_per_period }));
  if (plan.accounts_included != null) includes.push(t("accounts", { count: plan.accounts_included }));
  if (plan.platforms.length) includes.push(plan.platforms.map((p) => t(`platformNames.${p}` as never)).join(", "));
  if (plan.delivery_days != null) includes.push(t("delivery", { count: plan.delivery_days }));
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
  };
}
