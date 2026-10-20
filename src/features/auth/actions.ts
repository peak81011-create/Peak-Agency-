"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/auth/actions";
import { logActivity } from "@/lib/activity";
import { homePathFor } from "@/lib/auth/session";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  forgotSchema,
  loginSchema,
  mfaCodeSchema,
  resetSchema,
  signupSchema,
  type ForgotInput,
  type LoginInput,
  type MfaCodeInput,
  type ResetInput,
  type SignupInput,
} from "@/lib/validation/auth";

/** Chemin interne sûr pour la redirection après connexion (évite les redirections ouvertes). */
function safeNextPath(next: string | undefined): string | null {
  if (!next || !/^\/(fr|en)\/(app|admin|account)(\/[A-Za-z0-9\-/]*)?$/.test(next)) return null;
  return next.replace(/^\/(fr|en)/, "");
}

/** La session doit-elle passer par la double authentification ? */
async function needsMfa(role: string | undefined): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel === "aal2") return false;
  return role === "owner" || data?.nextLevel === "aal2";
}

export async function loginAction(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("login", RATE_LIMITS.login.max, RATE_LIMITS.login.windowSeconds))) {
    return { ok: false, error: "rateLimited" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { ok: false, error: error?.code === "email_not_confirmed" ? "emailNotConfirmed" : "invalidCredentials" };
  }

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).single();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { ok: false, error: "accountDisabled" };
  }
  await logActivity({ actorId: data.user.id, action: "auth.login" });

  const locale = await getLocale();
  if (await needsMfa(profile.role)) {
    redirect({ href: { pathname: "/mfa", query: next ? { next } : {} }, locale });
  }
  redirect({ href: safeNextPath(next) ?? homePathFor({ role: profile.role }), locale });
  return { ok: true };
}

export async function signupAction(input: SignupInput, intendedPlan?: string): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("signup", RATE_LIMITS.signup.max, RATE_LIMITS.signup.windowSeconds))) {
    return { ok: false, error: "rateLimited" };
  }

  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Seules ces métadonnées « utilisateur » sont lues ; le rôle n'en vient jamais.
      data: {
        full_name: parsed.data.fullName,
        creator_name: parsed.data.creatorName,
        locale,
        // Offre repérée sur la vitrine, proposée par défaut à l'étape « offre »
        intended_plan: intendedPlan && z.uuid().safeParse(intendedPlan).success ? intendedPlan : null,
      },
    },
  });
  if (error) {
    return { ok: false, error: error.code === "over_email_send_rate_limit" ? "rateLimited" : "generic" };
  }
  redirect({ href: "/check-email", locale });
  return { ok: true };
}

export async function forgotPasswordAction(input: ForgotInput): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("password-reset", RATE_LIMITS.passwordReset.max, RATE_LIMITS.passwordReset.windowSeconds))) {
    return { ok: false, error: "rateLimited" };
  }
  const supabase = await createSupabaseServerClient();
  // Même réponse que l'adresse existe ou non (pas d'énumération des comptes).
  await supabase.auth.resetPasswordForEmail(parsed.data.email);
  return { ok: true };
}

export async function resetPasswordAction(input: ResetInput): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { ok: false, error: "linkInvalid" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.code === "reauthentication_needed" ? "linkInvalid" : "generic" };
  await logActivity({ actorId: claims.claims.sub, action: "auth.password_changed" });
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect({ href: "/login", locale: await getLocale() });
}

/** Démarre l'enrôlement TOTP : renvoie le QR code à scanner. */
export async function startMfaEnrollAction(): Promise<ActionResult<{ factorId: string; qrCode: string; secret: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { ok: false, error: "unauthenticated" };

  // Supprime les tentatives d'enrôlement inachevées.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `totp-${Date.now()}` });
  if (error || !data) return { ok: false, error: "generic" };
  return { ok: true, data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret } };
}

/** Vérifie un code TOTP (enrôlement ou connexion) et passe la session en aal2. */
export async function verifyMfaAction(input: MfaCodeInput, factorId?: string, next?: string): Promise<ActionResult> {
  const parsed = mfaCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("mfa", RATE_LIMITS.mfa.max, RATE_LIMITS.mfa.windowSeconds))) {
    return { ok: false, error: "rateLimited" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { ok: false, error: "unauthenticated" };

  let id = factorId;
  if (!id) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    id = factors?.totp.find((f) => f.status === "verified")?.id;
  }
  if (!id) return { ok: false, error: "invalidCode" };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code: parsed.data.code });
  if (error) return { ok: false, error: "invalidCode" };
  await logActivity({ actorId: claims.claims.sub, action: factorId ? "auth.mfa_enrolled" : "auth.mfa_verified" });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", claims.claims.sub).single();
  redirect({ href: safeNextPath(next) ?? homePathFor({ role: profile?.role ?? "client" }), locale: await getLocale() });
  return { ok: true };
}
