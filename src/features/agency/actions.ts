"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/auth/actions";
import { authorize } from "@/lib/auth/actions";
import { getSessionUser, isStaff } from "@/lib/auth/session";
import { logError } from "@/lib/log";
import { notifyUsers } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { commentSchema, ENTITY_TYPES, requestSchema, type EntityType, type RequestInput } from "@/lib/validation/agency";

const ENTITY_TABLE: Record<EntityType, "clips" | "requests" | "source_videos" | "clients"> = {
  clip: "clips",
  request: "requests",
  video: "source_videos",
  client: "clients",
};

async function teamOf(clientId: string): Promise<string[]> {
  const { data } = await createSupabaseAdminClient().rpc("client_team", { p_client_id: clientId });
  return ((data as unknown[] | null) ?? []).map((r) => (typeof r === "string" ? r : (r as { client_team: string }).client_team));
}

async function clientInfo(clientId: string) {
  const { data } = await createSupabaseAdminClient().from("clients").select("profile_id, creator_name").eq("id", clientId).single();
  return data as { profile_id: string; creator_name: string } | null;
}

const LINKS: Record<EntityType, { client: (id: string) => string; staff: (id: string) => string }> = {
  clip: { client: (id) => `/app/clips/${id}`, staff: (id) => `/admin/clips/${id}` },
  request: { client: (id) => `/app/requests/${id}`, staff: (id) => `/admin/requests?id=${id}` },
  video: { client: () => "/app/videos", staff: (id) => `/admin/videos?id=${id}` },
  client: { client: () => "/app", staff: (id) => `/admin/clients/${id}` },
};

/** Commentaire sur un clip, une demande, une vidéo, ou note interne d'une fiche client. */
export async function addCommentAction(
  entityType: EntityType,
  entityId: string,
  body: string,
  isInternal = false,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (!ENTITY_TYPES.includes(entityType) || !z.uuid().safeParse(entityId).success) return { ok: false, error: "generic" };
  const parsed = commentSchema.safeParse({ body });
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const internal = entityType === "client" || (isInternal && isStaff(user));

  // L'élément doit être visible avec la session de l'utilisateur (RLS).
  const supabase = await createSupabaseServerClient();
  const column = entityType === "client" ? "id" : "client_id";
  const { data: entity } = await supabase.from(ENTITY_TABLE[entityType]).select(column).eq("id", entityId).maybeSingle();
  const clientId = (entity as Record<string, string> | null)?.[column];
  if (!clientId) return { ok: false, error: "forbidden" };

  const { error } = await supabase.from("comments").insert({
    client_id: clientId,
    entity_type: entityType,
    entity_id: entityId,
    author_id: user.id,
    body: parsed.data.body,
    is_internal: internal,
  });
  if (error) {
    logError("comments.insert", error);
    return { ok: false, error: "readOnlyOrForbidden" };
  }

  if (!internal) {
    const client = await clientInfo(clientId);
    const preview = parsed.data.body.slice(0, 300);
    if (user.role === "client") {
      const team = (await teamOf(clientId)).filter((id) => id !== user.id);
      await notifyUsers(team, "comment_added", { author: client?.creator_name ?? "", body: preview }, LINKS[entityType].staff(entityId));
    } else if (client) {
      await notifyUsers([client.profile_id], "comment_added", { author: user.fullName || "Peak", body: preview }, LINKS[entityType].client(entityId));
    }
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Le client valide un clip ou demande une modification. */
export async function reviewClipAction(clipId: string, approve: boolean, feedback: string): Promise<ActionResult> {
  const auth = await authorize("clips.validate");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!z.uuid().safeParse(clipId).success) return { ok: false, error: "generic" };
  if (!approve && feedback.trim().length === 0) return { ok: false, error: "feedbackRequired" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("client_review_clip", {
    p_clip_id: clipId,
    p_approve: approve,
    p_feedback: feedback.slice(0, 2000),
  });
  if (error) {
    logError("clips.review", error);
    return { ok: false, error: error.message.includes("lecture seule") ? "readOnly" : "generic" };
  }

  const { data: clip } = await createSupabaseAdminClient().from("clips").select("client_id, title, editor_id").eq("id", clipId).single();
  if (clip && !approve) {
    const team = await teamOf(clip.client_id);
    await notifyUsers(team, "clip_changes_requested", { title: clip.title, feedback: feedback.slice(0, 300) }, `/admin/clips/${clipId}`);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Nouvelle demande du client (l'espace doit être actif : vérifié par la RLS). */
export async function createRequestAction(input: RequestInput): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize("requests.create");
  if (!auth.ok || !auth.user.client) return { ok: false, error: auth.ok ? "forbidden" : auth.error };
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("requests")
    .insert({
      client_id: auth.user.client.id,
      created_by: auth.user.id,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      desired_due_date: parsed.data.desiredDueDate || null,
    })
    .select("id")
    .single();
  if (error || !data) {
    logError("requests.create", error);
    return { ok: false, error: "readOnlyOrForbidden" };
  }
  const team = await teamOf(auth.user.client.id);
  await notifyUsers(team, "request_created", { client: auth.user.client.creatorName, title: parsed.data.title }, `/admin/requests?id=${data.id}`);
  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id } };
}

/** Le client clôt sa demande. */
export async function closeRequestAction(requestId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "client") return { ok: false, error: "forbidden" };
  if (!z.uuid().safeParse(requestId).success) return { ok: false, error: "generic" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("client_close_request", { p_request_id: requestId });
  if (error) {
    logError("requests.close", error);
    return { ok: false, error: "generic" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
