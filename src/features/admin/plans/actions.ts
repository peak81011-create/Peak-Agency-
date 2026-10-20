"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/auth/actions";
import { authorize } from "@/lib/auth/actions";
import { parseEurosToCents } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { linesToList, planFormSchema, type PlanFormInput } from "@/lib/validation/plan";

const toInt = (v: string) => (v === "" ? null : Number(v));

/** Création ou modification d'une offre. Enregistrer une offre de démo la marque comme réelle. */
export async function savePlanAction(planId: string | null, input: PlanFormInput): Promise<ActionResult> {
  const auth = await authorize("plans.manage");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (planId && !z.uuid().safeParse(planId).success) return { ok: false, error: "generic" };
  const parsed = planFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const priceCents = parseEurosToCents(v.price);
  if (priceCents === null) return { ok: false, error: "validation", fieldErrors: { price: "price" } };

  const row = {
    name_fr: v.nameFr,
    name_en: v.nameEn,
    description_fr: v.descriptionFr,
    description_en: v.descriptionEn,
    price_cents: priceCents,
    billing_period: v.billingPeriod,
    clips_per_period: toInt(v.clipsPerPeriod),
    accounts_included: toInt(v.accountsIncluded),
    delivery_days: toInt(v.deliveryDays),
    platforms: v.platforms,
    features_fr: linesToList(v.featuresFr),
    features_en: linesToList(v.featuresEn),
    sort_order: Number(v.sortOrder),
    is_visible: v.isVisible,
    is_featured: v.isFeatured,
    is_demo: false,
  };

  // Session de l'utilisateur : la RLS (plans.manage) s'applique aussi en base.
  const supabase = await createSupabaseServerClient();
  const { data, error } = planId
    ? await supabase.from("plans").update(row).eq("id", planId).select("id").single()
    : await supabase.from("plans").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "generic" };

  await logActivity({
    actorId: auth.user.id,
    action: planId ? "plan.updated" : "plan.created",
    entityType: "plan",
    entityId: data.id,
    metadata: { name: v.nameFr, price_cents: priceCents, visible: v.isVisible },
  });
  revalidatePath("/", "layout");
  redirect({ href: "/admin/plans", locale: await getLocale() });
  return { ok: true };
}
