import type { PlanRow } from "@/features/client/queries";
import type { PlanFormInput } from "@/lib/validation/plan";
import { PLATFORMS } from "@/lib/validation/plan";

const str = (n: number | null) => (n == null ? "" : String(n));

export function planToForm(plan: PlanRow | null): PlanFormInput {
  return {
    nameFr: plan?.name_fr ?? "",
    nameEn: plan?.name_en ?? "",
    descriptionFr: plan?.description_fr ?? "",
    descriptionEn: plan?.description_en ?? "",
    price: plan ? (plan.price_cents / 100).toFixed(2).replace(/\.00$/, "") : "",
    billingPeriod: plan?.billing_period ?? "mensuel",
    clipsPerPeriod: str(plan?.clips_per_period ?? null),
    accountsIncluded: str(plan?.accounts_included ?? null),
    deliveryDays: str(plan?.delivery_days ?? null),
    platforms: (plan?.platforms ?? []).filter((p): p is (typeof PLATFORMS)[number] => (PLATFORMS as readonly string[]).includes(p)),
    featuresFr: (plan?.features_fr ?? []).join("\n"),
    featuresEn: (plan?.features_en ?? []).join("\n"),
    sortOrder: String(plan?.sort_order ?? 0),
    isVisible: plan?.is_visible ?? true,
    isFeatured: plan?.is_featured ?? false,
    slug: plan?.slug ?? "",
    taglineFr: plan?.tagline_fr ?? "",
    taglineEn: plan?.tagline_en ?? "",
    clipLengthFr: plan?.clip_length_fr ?? "",
    clipLengthEn: plan?.clip_length_en ?? "",
    detailsFr: plan?.details_fr ?? "",
    detailsEn: plan?.details_en ?? "",
  };
}
