"use server";

import { z } from "zod";
import { logError } from "@/lib/log";
import { rateLimit } from "@/lib/security/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Vote « Cette réponse vous a aidé ? » (anonyme, limité par adresse IP). */
export async function voteFaqAction(faqId: string, helpful: boolean): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(faqId).success || typeof helpful !== "boolean") return { ok: false };
  if (!(await rateLimit("faq_vote", 30, 60 * 60))) return { ok: false };
  const { error } = await createSupabaseAdminClient().from("faq_feedback").insert({ faq_id: faqId, helpful });
  logError("faq.vote", error);
  return { ok: !error };
}
