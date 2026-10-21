"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/auth/actions";
import { authorize } from "@/lib/auth/actions";
import { can, getSessionUser } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { logError } from "@/lib/log";
import { notifyUsers } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  accountFormSchema,
  CLIP_STATUSES,
  clipFormSchema,
  inviteClientSchema,
  parseHashtags,
  parseTimecode,
  type AccountFormInput,
  type ClipFormInput,
  type InviteClientInput,
} from "@/lib/validation/admin-agency";
import { fieldErrors } from "@/lib/validation/auth";
import { parseEurosToCents } from "@/lib/format";

const uuid = z.uuid();
const optionalUuid = (v: string) => (v && uuid.safeParse(v).success ? v : null);
const optionalIso = (v: string) => (v ? new Date(v).toISOString() : null);

async function clientProfile(clientId: string) {
  const { data } = await createSupabaseAdminClient()
    .from("clients")
    .select("profile_id, creator_name, requires_client_validation")
    .eq("id", clientId)
    .single();
  return data as { profile_id: string; creator_name: string; requires_client_validation: boolean } | null;
}

// ---------------------------------------------------------------------------
// Abonnement (prolonger, suspendre, réactiver, changer d'offre, tarif…)
// ---------------------------------------------------------------------------
const subscriptionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("extend"), periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ action: z.enum(["suspend", "reactivate", "archive", "toggle_validation"]) }),
  z.object({ action: z.literal("change_plan"), planId: z.uuid() }),
  z.object({ action: z.literal("custom_price"), price: z.string() }),
]);

export async function updateSubscriptionAction(clientId: string, input: z.infer<typeof subscriptionSchema>): Promise<ActionResult> {
  const auth = await authorize("clients.manage_subscription", { clientId });
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const v = parsed.data;
  let customPrice: number | null = null;
  if (v.action === "custom_price" && v.price.trim() !== "") {
    customPrice = parseEurosToCents(v.price);
    if (customPrice === null) return { ok: false, error: "price" };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_subscription", {
    p_client_id: clientId,
    p_action: v.action,
    p_plan_id: v.action === "change_plan" ? v.planId : null,
    p_custom_price_cents: customPrice,
    p_period_end: v.action === "extend" ? v.periodEnd : null,
  });
  if (error) {
    logError("clients.subscription", error);
    return { ok: false, error: "generic" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Équipe attribuée à un client
// ---------------------------------------------------------------------------
export async function assignTeamAction(clientId: string, userId: string, teamRole: string): Promise<ActionResult> {
  const auth = await authorize("clients.update", { clientId });
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!uuid.safeParse(userId).success) return { ok: false, error: "generic" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("assignments")
    .upsert({ client_id: clientId, user_id: userId, team_role: teamRole.slice(0, 60) || "membre" }, { onConflict: "user_id,client_id" });
  if (error) {
    logError("clients.assign", error);
    return { ok: false, error: "forbidden" };
  }
  await logActivity({ actorId: auth.user.id, action: "client.assigned", entityType: "client", entityId: clientId, metadata: { user_id: userId, team_role: teamRole } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unassignTeamAction(clientId: string, userId: string): Promise<ActionResult> {
  const auth = await authorize("clients.update", { clientId });
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("assignments").delete().eq("client_id", clientId).eq("user_id", userId);
  if (error) return { ok: false, error: "forbidden" };
  await logActivity({ actorId: auth.user.id, action: "client.unassigned", entityType: "client", entityId: clientId, metadata: { user_id: userId } });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Invitation d'un client par l'agence
// ---------------------------------------------------------------------------
export async function inviteClientAction(input: InviteClientInput): Promise<ActionResult> {
  const auth = await authorize("clients.create");
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = inviteClientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const { data, error } = await createSupabaseAdminClient().auth.admin.inviteUserByEmail(v.email, {
    data: { full_name: v.fullName, creator_name: v.creatorName, locale: v.locale },
    redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/${v.locale}/reset-password`,
  });
  if (error || !data.user) {
    logError("clients.invite", error);
    return { ok: false, error: error?.code === "email_exists" ? "emailExists" : "generic" };
  }
  await logActivity({ actorId: auth.user.id, action: "client.invited", entityType: "profile", entityId: data.user.id, metadata: { email: v.email } });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------
function clipRow(v: z.infer<typeof clipFormSchema>) {
  return {
    client_id: v.clientId,
    title: v.title,
    hook: v.hook,
    caption: v.caption,
    hashtags: parseHashtags(v.hashtags),
    start_seconds: parseTimecode(v.start),
    end_seconds: parseTimecode(v.end),
    source_video_id: optionalUuid(v.sourceVideoId),
    social_account_id: optionalUuid(v.socialAccountId),
    clipper_id: optionalUuid(v.clipperId),
    due_at: optionalIso(v.dueAt),
    scheduled_at: optionalIso(v.scheduledAt),
    published_url: v.publishedUrl || null,
  };
}

/** Création ou modification d'un clip (la RLS limite aux clients attribués et aux clips du monteur). */
export async function saveClipAction(clipId: string | null, input: ClipFormInput): Promise<ActionResult<{ id: string }>> {
  const parsed = clipFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const auth = await authorize(clipId ? "clips.read" : "clips.create", { clientId: parsed.data.clientId });
  if (!auth.ok) return { ok: false, error: auth.error };
  const row = clipRow(parsed.data);
  if (row.start_seconds != null && row.end_seconds != null && row.end_seconds <= row.start_seconds) {
    return { ok: false, error: "validation", fieldErrors: { end: "timecodeOrder" } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = clipId
    ? await supabase.from("clips").update(row).eq("id", clipId).select("id").maybeSingle()
    : await supabase.from("clips").insert({ ...row, created_by: auth.user.id }).select("id").single();
  if (error || !data) {
    logError("clips.save", error);
    return { ok: false, error: "forbidden" };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id } };
}

/**
 * Changement de statut. « À valider » n'est utilisé que si le client a la
 * validation activée ; sinon le clip passe directement à « validé ».
 */
export async function setClipStatusAction(clipId: string, status: (typeof CLIP_STATUSES)[number]): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (!uuid.safeParse(clipId).success || !CLIP_STATUSES.includes(status)) return { ok: false, error: "generic" };
  const supabase = await createSupabaseServerClient();
  const { data: clip } = await supabase.from("clips").select("id, client_id, title, published_url").eq("id", clipId).maybeSingle();
  if (!clip) return { ok: false, error: "forbidden" };
  const needed = status === "publie" || status === "programme" ? "clips.publish" : "clips.create";
  if (!(await can(user, needed, { clientId: clip.client_id }))) return { ok: false, error: "forbidden" };

  const client = await clientProfile(clip.client_id);
  const effective = status === "a_valider" && client && !client.requires_client_validation ? "valide" : status;
  const patch: Record<string, unknown> = { status: effective };
  if (effective === "publie") patch.published_at = new Date().toISOString();

  const { data: updated, error } = await supabase.from("clips").update(patch).eq("id", clipId).select("id").maybeSingle();
  if (error || !updated) {
    logError("clips.status", error);
    return { ok: false, error: "forbidden" };
  }
  await logActivity({ actorId: user.id, action: `clip.status.${effective}`, entityType: "clip", entityId: clipId });
  if (client && effective === "a_valider") {
    await notifyUsers([client.profile_id], "clip_to_validate", { title: clip.title }, `/app/clips/${clipId}`);
  }
  if (client && effective === "publie") {
    await notifyUsers([client.profile_id], "clip_published", { title: clip.title }, `/app/clips/${clipId}`);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Création en lot de clips planifiés à partir d'une vidéo source (un titre par ligne). */
export async function createClipsFromVideoAction(videoId: string, titles: string, clipperId: string): Promise<ActionResult<{ count: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (!uuid.safeParse(videoId).success) return { ok: false, error: "generic" };
  const supabase = await createSupabaseServerClient();
  const { data: video } = await supabase.from("source_videos").select("id, client_id").eq("id", videoId).maybeSingle();
  if (!video || !(await can(user, "clips.create", { clientId: video.client_id }))) return { ok: false, error: "forbidden" };
  const list = titles
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 50);
  if (!list.length) return { ok: false, error: "required" };

  const { error } = await supabase.from("clips").insert(
    list.map((title) => ({
      client_id: video.client_id,
      source_video_id: video.id,
      clipper_id: optionalUuid(clipperId),
      title: title.slice(0, 200),
      status: "planifie",
      created_by: user.id,
    })),
  );
  if (error) {
    logError("clips.batch", error);
    return { ok: false, error: "forbidden" };
  }
  await supabase.from("source_videos").update({ status: "en_traitement" }).eq("id", video.id).eq("status", "recue");
  revalidatePath("/", "layout");
  return { ok: true, data: { count: list.length } };
}

export async function deleteClipAction(clipId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("clips").delete().eq("id", clipId).select("id");
  if (error || !data?.length) return { ok: false, error: "forbidden" };
  await logActivity({ actorId: user.id, action: "clip.deleted", entityType: "clip", entityId: clipId });
  revalidatePath("/", "layout");
  redirect({ href: "/admin/clips", locale: await getLocale() });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Vidéos sources
// ---------------------------------------------------------------------------
const VIDEO_STATUSES = ["recue", "en_traitement", "clips_extraits", "archivee", "erreur"] as const;

export async function setVideoStatusAction(videoId: string, status: (typeof VIDEO_STATUSES)[number]): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (!uuid.safeParse(videoId).success || !VIDEO_STATUSES.includes(status)) return { ok: false, error: "generic" };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("source_videos").update({ status }).eq("id", videoId).select("id");
  if (error || !data?.length) return { ok: false, error: "forbidden" };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Comptes de diffusion (la référence au gestionnaire de mots de passe est
// stockée à part, jamais visible par le client ; aucun mot de passe ici)
// ---------------------------------------------------------------------------
export async function saveAccountAction(accountId: string | null, input: AccountFormInput): Promise<ActionResult> {
  const parsed = accountFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const auth = await authorize("accounts.manage", { clientId: v.clientId });
  if (!auth.ok) return { ok: false, error: auth.error };

  const row = {
    client_id: v.clientId,
    platform: v.platform,
    handle: v.handle,
    url: v.url || null,
    owner_employee_id: optionalUuid(v.ownerEmployeeId),
    created_on: v.createdOn || null,
    status: v.status,
    followers_count: Number(v.followersCount || 0),
  };
  const supabase = await createSupabaseServerClient();
  const { data, error } = accountId
    ? await supabase.from("social_accounts").update(row).eq("id", accountId).select("id").maybeSingle()
    : await supabase.from("social_accounts").insert(row).select("id").single();
  if (error || !data) {
    logError("accounts.save", error);
    return { ok: false, error: "forbidden" };
  }
  const { error: privateError } = await supabase
    .from("social_account_private")
    .upsert({ account_id: data.id, password_manager_ref: v.passwordManagerRef, notes: v.notes });
  if (privateError) logError("accounts.private", privateError);
  await logActivity({ actorId: auth.user.id, action: accountId ? "account.updated" : "account.created", entityType: "social_account", entityId: data.id });
  revalidatePath("/", "layout");
  redirect({ href: "/admin/accounts", locale: await getLocale() });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Demandes clients (boîte de réception)
// ---------------------------------------------------------------------------
const requestUpdateSchema = z.object({
  status: z.enum(["nouvelle", "en_cours", "terminee", "refusee"]),
  priority: z.enum(["basse", "normale", "haute"]),
  assignedTo: z.string(),
});

export async function updateRequestAction(requestId: string, input: z.infer<typeof requestUpdateSchema>): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const parsed = requestUpdateSchema.safeParse(input);
  if (!parsed.success || !uuid.safeParse(requestId).success) return { ok: false, error: "generic" };
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("requests").select("client_id, assigned_to, title").eq("id", requestId).maybeSingle();
  if (!before || !(await can(user, "requests.manage", { clientId: before.client_id }))) return { ok: false, error: "forbidden" };

  const assignedTo = optionalUuid(parsed.data.assignedTo);
  const { error } = await supabase
    .from("requests")
    .update({ status: parsed.data.status, priority: parsed.data.priority, assigned_to: assignedTo })
    .eq("id", requestId);
  if (error) {
    logError("requests.update", error);
    return { ok: false, error: "forbidden" };
  }
  if (assignedTo && assignedTo !== before.assigned_to && assignedTo !== user.id) {
    await notifyUsers([assignedTo], "request_assigned", { title: before.title }, `/admin/requests?id=${requestId}`);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Transformer une demande en clip planifié (la demande passe « en cours »). */
export async function convertRequestToClipAction(requestId: string): Promise<ActionResult<{ clipId: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const supabase = await createSupabaseServerClient();
  const { data: request } = await supabase.from("requests").select("id, client_id, title, description").eq("id", requestId).maybeSingle();
  if (!request || !(await can(user, "requests.manage", { clientId: request.client_id })) || !(await can(user, "clips.create", { clientId: request.client_id }))) {
    return { ok: false, error: "forbidden" };
  }
  const { data: clip, error } = await supabase
    .from("clips")
    .insert({ client_id: request.client_id, title: request.title.slice(0, 200), caption: request.description.slice(0, 2200), status: "planifie", created_by: user.id })
    .select("id")
    .single();
  if (error || !clip) {
    logError("requests.convert", error);
    return { ok: false, error: "forbidden" };
  }
  await supabase.from("requests").update({ converted_clip_id: clip.id, status: "en_cours" }).eq("id", requestId);
  revalidatePath("/", "layout");
  return { ok: true, data: { clipId: clip.id } };
}
