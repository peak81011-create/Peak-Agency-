"use server";

import { logError } from "@/lib/log";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/auth/actions";
import { authorize } from "@/lib/auth/actions";
import { storeInvoicePdf } from "@/lib/invoices/store";
import { notifyUsers } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function clientUserOf(paymentId: string) {
  const { data } = await createSupabaseAdminClient()
    .from("payments")
    .select("reference, amount_cents, currency, client:clients(profile_id, creator_name)")
    .eq("id", paymentId)
    .single();
  return data as unknown as {
    reference: string;
    amount_cents: number;
    currency: string;
    client: { profile_id: string; creator_name: string };
  } | null;
}

/** Valider : la base vérifie la permission, passe le client actif et émet la facture. */
export async function validatePaymentAction(paymentId: string): Promise<ActionResult> {
  const auth = await authorize("payments.validate");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!z.uuid().safeParse(paymentId).success) return { ok: false, error: "generic" };

  const supabase = await createSupabaseServerClient();
  const { data: invoiceId, error } = await supabase.rpc("validate_payment", { p_payment_id: paymentId });
  logError("payments.validate", error);
  if (error || typeof invoiceId !== "string") {
    return { ok: false, error: error?.message.includes("déjà") ? "alreadyValidated" : "generic" };
  }

  // Le PDF est produit après coup : en cas d'échec, il sera régénéré au premier téléchargement.
  try {
    await storeInvoicePdf(invoiceId);
  } catch (err) {
    console.error("[facture] génération du PDF", err);
  }

  const info = await clientUserOf(paymentId);
  if (info) {
    await notifyUsers(
      [info.client.profile_id],
      "payment_validated",
      { reference: info.reference, amount_cents: info.amount_cents, currency: info.currency },
      "/app",
    );
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const refuseSchema = z.object({ paymentId: z.uuid(), reason: z.string().trim().min(3).max(1000) });

/** Refuser avec un motif visible par le client, qui peut redéposer une preuve. */
export async function refusePaymentAction(paymentId: string, reason: string): Promise<ActionResult> {
  const auth = await authorize("payments.validate");
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = refuseSchema.safeParse({ paymentId, reason });
  if (!parsed.success) return { ok: false, error: "reasonRequired" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("refuse_payment", { p_payment_id: parsed.data.paymentId, p_reason: parsed.data.reason });
  logError("payments.refuse", error);
  if (error) return { ok: false, error: "generic" };

  const info = await clientUserOf(paymentId);
  if (info) {
    await notifyUsers(
      [info.client.profile_id],
      "payment_refused",
      { reference: info.reference, reason: parsed.data.reason },
      "/app/payment",
    );
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
