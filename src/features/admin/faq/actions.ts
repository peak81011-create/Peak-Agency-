"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, authorize } from "@/lib/auth/actions";
import { logError } from "@/lib/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { type FaqItemInput, faqItemSchema } from "@/lib/validation/faq";

/** Création (id null) ou modification d'une question de la FAQ. */
export async function saveFaqItemAction(id: string | null, input: FaqItemInput): Promise<ActionResult> {
  const auth = await authorize("content.update");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (id !== null && !z.uuid().safeParse(id).success) return { ok: false, error: "validation" };
  const parsed = faqItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const row = {
    audience: v.audience,
    question_fr: v.questionFr,
    answer_fr: v.answerFr,
    question_en: v.questionEn,
    answer_en: v.answerEn,
    sort_order: Number(v.sortOrder),
    is_visible: v.isVisible,
    is_top: v.isTop,
  };
  const supabase = await createSupabaseServerClient();
  const { error } = id ? await supabase.from("faq_items").update(row).eq("id", id) : await supabase.from("faq_items").insert(row);
  logError("faq.save", error);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteFaqItemAction(id: string): Promise<ActionResult> {
  const auth = await authorize("content.update");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "validation" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("faq_items").delete().eq("id", id);
  logError("faq.delete", error);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}
