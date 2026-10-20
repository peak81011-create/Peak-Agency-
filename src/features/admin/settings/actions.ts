"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/auth/actions";
import { authorize } from "@/lib/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { settingsFormSchemas, type SettingsFormKey } from "@/lib/validation/settings";

export async function saveSettingsAction(key: SettingsFormKey, values: Record<string, string>): Promise<ActionResult> {
  const auth = await authorize("settings.update");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!(key in settingsFormSchemas)) return { ok: false, error: "generic" };
  const parsed = settingsFormSchemas[key].safeParse(values);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };

  let value: Record<string, unknown> = parsed.data;
  if (key === "bank") {
    const bank = parsed.data as { iban: string; bic: string };
    value = { ...value, iban: bank.iban.replace(/\s+/g, "").toUpperCase(), bic: bank.bic.replace(/\s+/g, "").toUpperCase() };
  }
  if (key === "company") value = { ...value, siret: String(value.siret).replace(/\s/g, "") };
  if (key === "billing") {
    const b = parsed.data as Record<string, string>;
    value = {
      payment_reference_prefix: b.payment_reference_prefix.toUpperCase(),
      invoice_prefix: b.invoice_prefix.toUpperCase(),
      grace_days: Number(b.grace_days),
      reminder_days_before: Number(b.reminder_days_before),
      currency: "EUR",
    };
  }

  // Session de l'utilisateur : la RLS (settings.update) s'applique aussi en base.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("settings").upsert({ key, value });
  if (error) return { ok: false, error: "generic" };

  // Les coordonnées bancaires sont sensibles : le journal garde la trace du changement.
  await logActivity({ actorId: auth.user.id, action: `settings.${key}_updated`, entityType: "settings" });
  revalidatePath("/", "layout");
  return { ok: true };
}
