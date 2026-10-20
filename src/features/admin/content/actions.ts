"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/auth/actions";
import { authorize } from "@/lib/auth/actions";
import { isListKey, listSchemas } from "@/lib/content/site-content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ALL_CONTENT_KEYS } from "./fields";

const valueSchema = z.string().max(30_000);

export async function saveContentAction(key: string, valueFr: string, valueEn: string): Promise<ActionResult> {
  const auth = await authorize("content.update");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!ALL_CONTENT_KEYS.includes(key)) return { ok: false, error: "generic" };
  if (!valueSchema.safeParse(valueFr).success || !valueSchema.safeParse(valueEn).success) return { ok: false, error: "tooLong" };

  if (isListKey(key)) {
    for (const raw of [valueFr, valueEn]) {
      try {
        if (!listSchemas[key].safeParse(JSON.parse(raw)).success) return { ok: false, error: "generic" };
      } catch {
        return { ok: false, error: "generic" };
      }
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("site_content")
    .upsert({ key, value_fr: valueFr, value_en: valueEn }, { onConflict: "key" });
  if (error) return { ok: false, error: "generic" };

  await logActivity({ actorId: auth.user.id, action: "content.updated", entityType: "site_content", metadata: { key } });
  revalidatePath("/", "layout");
  return { ok: true };
}
