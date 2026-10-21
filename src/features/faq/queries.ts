import "server-only";
import type { Locale } from "@/i18n/routing";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { fillVars } from "@/lib/content/vars";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FaqAudience = "createur" | "clipper";
export type FaqEntry = { id: string; audience: FaqAudience | "tous"; question: string; answer: string; isTop: boolean };

/**
 * FAQ publique dans la langue demandée, variables remplacées. Une réponse qui
 * utilise une variable non renseignée n'est pas affichée.
 */
export async function getFaq(locale: Locale): Promise<FaqEntry[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data }, commitments] = await Promise.all([
    supabase
      .from("faq_items")
      .select("id, audience, question_fr, answer_fr, question_en, answer_en, is_top")
      .eq("is_visible", true)
      .order("sort_order"),
    getCommitments(),
  ]);
  const vars = commitmentVars(commitments, locale);
  const out: FaqEntry[] = [];
  for (const row of data ?? []) {
    const question = fillVars(locale === "en" ? row.question_en : row.question_fr, vars);
    const answer = fillVars(locale === "en" ? row.answer_en : row.answer_fr, vars);
    if (question && answer) out.push({ id: row.id, audience: row.audience, question, answer, isTop: row.is_top });
  }
  return out;
}

/** Questions d'un public (les entrées « tous » apparaissent pour les deux). */
export function forAudience(items: FaqEntry[], audience: FaqAudience): FaqEntry[] {
  return items.filter((i) => i.audience === audience || i.audience === "tous");
}
