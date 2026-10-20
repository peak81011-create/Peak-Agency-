"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const localeSchema = z.enum(routing.locales);

/** Langue préférée (interface + e-mails). La RLS limite la mise à jour à son propre profil. */
export async function updateLocaleAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  const parsed = localeSchema.safeParse(formData.get("locale"));
  if (!user || !parsed.success) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("profiles").update({ locale: parsed.data }).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect({ href: "/account", locale: parsed.data });
}
