"use server";

import { getLocale } from "next-intl/server";
import type { ActionResult } from "@/lib/auth/actions";
import { logError } from "@/lib/log";
import { emailAddress, notifyPermission } from "@/lib/notifications";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { getSettings } from "@/lib/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fieldErrors } from "@/lib/validation/auth";
import { joinSchema, type JoinInput } from "@/lib/validation/join";

export async function sendJoinApplicationAction(input: JoinInput): Promise<ActionResult> {
  // Robot (champ piège rempli) : on répond comme si tout allait bien.
  if (input.website) return { ok: true };
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("join", RATE_LIMITS.contact.max, RATE_LIMITS.contact.windowSeconds))) {
    return { ok: false, error: "rateLimited" };
  }

  const v = parsed.data;
  const { error } = await createSupabaseAdminClient()
    .from("clipper_applications")
    .insert({
      full_name: v.fullName,
      email: v.email,
      portfolio_url: v.portfolioUrl || null,
      platforms: [...new Set(v.platforms)],
      experience: v.experience,
      tools: v.tools || null,
      hours_per_week: v.hoursPerWeek,
      languages: v.languages || null,
      message: v.message || null,
      locale: await getLocale(),
    });
  logError("join.insert", error);
  if (error) return { ok: false, error: "generic" };

  const payload = { name: v.fullName, email: v.email };
  await notifyPermission("users.manage", "clipper_application", payload, "/admin/applications");
  const { admin_email } = await getSettings("notifications");
  if (admin_email) await emailAddress(admin_email, "clipper_application", payload, "/admin/applications");
  return { ok: true };
}
