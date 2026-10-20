import "server-only";
import { z } from "zod";
import type { Locale } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Contenu éditable par l'admin (table site_content), en FR et EN.

export const listSchemas = {
  "home.steps": z.array(z.object({ title: z.string(), body: z.string() })),
  "home.stats": z.array(z.object({ value: z.string(), label: z.string() })),
  "home.testimonials": z.array(z.object({ quote: z.string(), name: z.string(), handle: z.string().optional() })),
  "home.faq": z.array(z.object({ q: z.string(), a: z.string() })),
} as const;

export type ListKey = keyof typeof listSchemas;
export type ListItem<K extends ListKey> = z.infer<(typeof listSchemas)[K]>[number];

export async function getContent(keys: readonly string[], locale: Locale): Promise<Record<string, string>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("site_content").select("key, value_fr, value_en").in("key", keys as string[]);
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.key] = locale === "en" ? row.value_en : row.value_fr;
  return out;
}

/** Liste JSON du contenu (FAQ, chiffres…) ; une valeur invalide donne une liste vide. */
export function parseList<K extends ListKey>(key: K, raw: string | undefined): ListItem<K>[] {
  try {
    const parsed = listSchemas[key].safeParse(JSON.parse(raw ?? "[]"));
    return parsed.success ? (parsed.data as ListItem<K>[]) : [];
  } catch {
    return [];
  }
}

export function isListKey(key: string): key is ListKey {
  return key in listSchemas;
}
