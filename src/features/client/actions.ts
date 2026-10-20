"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/auth/actions";
import { authorize } from "@/lib/auth/actions";
import { getSessionUser } from "@/lib/auth/session";
import { notifyPermission } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import {
  creatorProfileSchema,
  PROOF_MIME_TYPES,
  proofUploadSchema,
  safeFileName,
  type CreatorProfileInput,
  type ProofUploadInput,
} from "@/lib/validation/client";

async function currentClient() {
  const user = await getSessionUser();
  if (!user || user.role !== "client" || !user.client) return null;
  return { user, client: user.client };
}

/** Profil créateur (1re étape de l'accueil, puis modifiable à tout moment). */
export async function saveCreatorProfileAction(input: CreatorProfileInput, onboarding: boolean): Promise<ActionResult> {
  const ctx = await currentClient();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = creatorProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const channels = Object.fromEntries(Object.entries(v.channels).filter(([, url]) => url !== ""));
  // Client Supabase de l'utilisateur : la RLS et la garde SQL empêchent de
  // toucher au statut, à l'offre ou aux dates d'abonnement.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({
      creator_name: v.creatorName,
      niche: v.niche,
      language: v.language,
      channels,
      goals: v.goals || null,
      live_availability: v.liveAvailability || null,
      billing_address: v.billingAddress || null,
      ...(ctx.client.profileCompleted ? {} : { profile_completed_at: new Date().toISOString() }),
    })
    .eq("id", ctx.client.id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath("/", "layout");
  if (onboarding) redirect({ href: "/app/plan", locale: await getLocale() });
  return { ok: true };
}

/** Choix de l'offre : ouvre (ou met à jour) le paiement à effectuer. */
export async function choosePlanAction(planId: string): Promise<ActionResult> {
  const ctx = await currentClient();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!z.uuid().safeParse(planId).success) return { ok: false, error: "generic" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("client_choose_plan", { p_plan_id: planId });
  if (error) return { ok: false, error: error.message.includes("état") ? "planLocked" : "generic" };

  revalidatePath("/", "layout");
  redirect({ href: "/app/payment", locale: await getLocale() });
  return { ok: true };
}

/**
 * Prépare l'envoi direct de la preuve vers le stockage privé : URL signée à
 * usage unique, valable pour ce paiement uniquement. Le fichier ne transite
 * pas par le serveur (limite de taille des fonctions Vercel).
 */
export async function createProofUploadAction(
  input: ProofUploadInput,
): Promise<ActionResult<{ path: string; token: string }>> {
  const auth = await authorize("payments.submit_proof");
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = proofUploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "generic" };

  // Lecture avec la session du client : la RLS garantit que le paiement est le sien.
  const supabase = await createSupabaseServerClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, client_id, status")
    .eq("id", parsed.data.paymentId)
    .maybeSingle();
  if (!payment || !["en_attente", "refuse"].includes(payment.status)) return { ok: false, error: "forbidden" };

  const path = `${payment.client_id}/${payment.id}/${Date.now()}-${safeFileName(parsed.data.fileName)}`;
  const { data, error } = await createSupabaseAdminClient().storage.from("payment-proofs").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "generic" };
  return { ok: true, data: { path: data.path, token: data.token } };
}

/** Le fichier est déposé : passe le paiement « à vérifier » et prévient l'agence. */
export async function submitProofAction(input: {
  paymentId: string;
  path: string;
  mimeType: string;
}): Promise<ActionResult> {
  const auth = await authorize("payments.submit_proof");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!z.uuid().safeParse(input.paymentId).success || !(PROOF_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    return { ok: false, error: "generic" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_payment_proof", {
    p_payment_id: input.paymentId,
    p_path: input.path,
    p_mime: input.mimeType,
  });
  if (error) return { ok: false, error: "generic" };

  const { data: payment } = await supabase
    .from("payments")
    .select("reference, amount_cents, currency")
    .eq("id", input.paymentId)
    .single();
  const client = auth.user.client;
  if (payment && client) {
    await notifyPermission(
      "payments.validate",
      "payment_proof_submitted",
      {
        client: client.creatorName || auth.user.fullName || auth.user.email,
        reference: payment.reference,
        amount_cents: payment.amount_cents,
        currency: payment.currency,
      },
      `/admin/payments?id=${input.paymentId}`,
    );
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
