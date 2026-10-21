"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/auth/actions";
import { can, requireUser } from "@/lib/auth/session";
import { logError } from "@/lib/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { APPLICATION_STATUSES } from "@/lib/validation/join";

/** Suivi d'une candidature de clipper (nouvelle → en cours → acceptée / refusée). */
export async function setApplicationStatusAction(id: string, status: (typeof APPLICATION_STATUSES)[number]): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await can(user, "users.manage"))) return { ok: false, error: "forbidden" };
  if (!z.uuid().safeParse(id).success || !APPLICATION_STATUSES.includes(status)) return { ok: false, error: "validation" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("clipper_applications").update({ status, reviewed_by: user.id }).eq("id", id);
  if (error) {
    logError("applications.status", error);
    return { ok: false, error: "forbidden" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
