"use server";

import { logError } from "@/lib/log";
import { getLocale } from "next-intl/server";
import type { ActionResult } from "@/lib/auth/actions";
import { emailAddress, notifyPermission } from "@/lib/notifications";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { getSettings } from "@/lib/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fieldErrors } from "@/lib/validation/auth";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";

export async function sendContactAction(input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  // Robot (champ piège rempli) : on répond comme si tout allait bien.
  if (input.website) return { ok: true };
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("contact", RATE_LIMITS.contact.max, RATE_LIMITS.contact.windowSeconds))) {
    return { ok: false, error: "rateLimited" };
  }

  const v = parsed.data;
  const { error } = await createSupabaseAdminClient()
    .from("contact_messages")
    .insert({ name: v.name, email: v.email, channel_url: v.channelUrl || null, message: v.message, locale: await getLocale() });
  logError("contact.insert", error);
  if (error) return { ok: false, error: "generic" };

  const payload = { name: v.name, email: v.email, message: v.message.slice(0, 500) };
  await notifyPermission("requests.manage", "contact_received", payload, "/admin");
  const { admin_email } = await getSettings("notifications");
  if (admin_email) await emailAddress(admin_email, "contact_received", payload, "/admin");
  return { ok: true };
}
