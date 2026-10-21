"use server";

import { logError } from "@/lib/log";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/auth/actions";
import { authorize } from "@/lib/auth/actions";
import { can, getSessionUser } from "@/lib/auth/session";
import { notifyUsers } from "@/lib/notifications";
import { getSettingsValue } from "@/lib/settings";
import { normalizeVideoMime, objectKey } from "@/lib/storage/keys";
import { isVideoStorageConfigured, objectSize } from "@/lib/storage/s3";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { videoFileSchema, videoLinkSchema, type VideoFileInput, type VideoLinkInput } from "@/lib/validation/video";

const MAX_CLIP_BYTES = 2 * 1024 ** 3;

async function teamOf(clientId: string): Promise<string[]> {
  const { data } = await createSupabaseAdminClient().rpc("client_team", { p_client_id: clientId });
  return ((data as unknown[] | null) ?? []).map((r) => (typeof r === "string" ? r : (r as { client_team: string }).client_team));
}

/** Prévenir l'équipe du client qu'une vidéo est arrivée. */
async function notifyVideo(clientId: string, videoId: string, title: string, actorId: string) {
  const { data: client } = await createSupabaseAdminClient().from("clients").select("creator_name").eq("id", clientId).single();
  const team = (await teamOf(clientId)).filter((id) => id !== actorId);
  await notifyUsers(team, "video_received", { client: client?.creator_name ?? "", title }, `/admin/videos?id=${videoId}`);
}

function videoRow(clientId: string, userId: string, v: { title: string; notes: string; priority: string; recordedAt: string }) {
  return {
    client_id: clientId,
    uploaded_by: userId,
    title: v.title,
    notes: v.notes,
    priority: v.priority,
    recorded_at: v.recordedAt || null,
  };
}

/** Vidéo envoyée sous forme de lien : enregistrée telle quelle. */
export async function createLinkVideoAction(clientId: string, input: VideoLinkInput): Promise<ActionResult> {
  const auth = await authorize("videos.upload", { clientId });
  if (!auth.ok) return { ok: false, error: auth.error };
  const parsed = videoLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };

  // Session de l'utilisateur : la RLS vérifie aussi que l'espace est actif.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("source_videos")
    .insert({ ...videoRow(clientId, auth.user.id, parsed.data), kind: "lien", url: parsed.data.url, status: "recue" })
    .select("id")
    .single();
  if (error || !data) {
    logError("videos.link", error);
    return { ok: false, error: "readOnlyOrForbidden" };
  }
  await notifyVideo(clientId, data.id, parsed.data.title || parsed.data.url, auth.user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Prépare l'envoi direct d'un gros fichier : fiche « en cours d'envoi » + clé autorisée. */
export async function prepareVideoUploadAction(
  clientId: string,
  input: VideoFileInput,
): Promise<ActionResult<{ videoId: string; key: string }>> {
  const auth = await authorize("videos.upload", { clientId });
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!isVideoStorageConfigured()) return { ok: false, error: "storageMissing" };
  const parsed = videoFileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const mime = normalizeVideoMime(parsed.data.mimeType, parsed.data.fileName);
  if (!mime) return { ok: false, error: "videoType" };
  const { max_video_bytes } = await getSettingsValue("uploads", { max_video_bytes: 10 * 1024 ** 3 });
  if (parsed.data.size > Number(max_video_bytes)) return { ok: false, error: "videoSize" };

  const videoId = crypto.randomUUID();
  const key = objectKey("video", clientId, videoId, parsed.data.fileName);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("source_videos").insert({
    id: videoId,
    ...videoRow(clientId, auth.user.id, parsed.data),
    title: parsed.data.title || parsed.data.fileName,
    kind: "fichier",
    storage_key: key,
    file_name: parsed.data.fileName,
    size_bytes: parsed.data.size,
    status: "envoi",
  });
  if (error) {
    logError("videos.prepare", error);
    return { ok: false, error: "readOnlyOrForbidden" };
  }
  await createSupabaseAdminClient()
    .from("pending_uploads")
    .insert({ user_id: auth.user.id, object_key: key, purpose: "video", entity_id: videoId, size_bytes: parsed.data.size, mime });
  return { ok: true, data: { videoId, key } };
}

/** Prépare le dépôt du fichier fini d'un clip (monteur). */
export async function prepareClipUploadAction(
  clipId: string,
  file: { fileName: string; mimeType: string; size: number },
): Promise<ActionResult<{ key: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (!z.uuid().safeParse(clipId).success || file.size <= 0 || file.size > MAX_CLIP_BYTES) return { ok: false, error: "videoSize" };
  if (!isVideoStorageConfigured()) return { ok: false, error: "storageMissing" };
  const mime = normalizeVideoMime(file.mimeType, file.fileName);
  if (!mime) return { ok: false, error: "videoType" };

  const supabase = await createSupabaseServerClient();
  const { data: clip } = await supabase.from("clips").select("id, client_id, clipper_id").eq("id", clipId).maybeSingle();
  if (!clip || !(await can(user, "clips.create", { clientId: clip.client_id }))) return { ok: false, error: "forbidden" };
  if (clip.clipper_id && clip.clipper_id !== user.id && !(await can(user, "clients.update"))) return { ok: false, error: "forbidden" };

  const key = objectKey("clip", clip.client_id, `${clip.id}-${Date.now()}`, file.fileName);
  await createSupabaseAdminClient()
    .from("pending_uploads")
    .insert({ user_id: user.id, object_key: key, purpose: "clip", entity_id: clip.id, size_bytes: file.size, mime });
  return { ok: true, data: { key } };
}

/** Fin d'envoi : vérifie que le fichier est bien arrivé, puis l'attache à la vidéo ou au clip. */
export async function completeUploadAction(key: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const admin = createSupabaseAdminClient();
  const { data: pending } = await admin
    .from("pending_uploads")
    .select("id, purpose, entity_id, size_bytes, completed_at")
    .eq("object_key", key)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pending) return { ok: false, error: "forbidden" };
  if (pending.completed_at) return { ok: true };

  const size = await objectSize(key);
  if (size === null || size !== Number(pending.size_bytes)) return { ok: false, error: "uploadFailed" };
  await admin.from("pending_uploads").update({ completed_at: new Date().toISOString() }).eq("id", pending.id);

  if (pending.purpose === "video") {
    const { data: video } = await admin
      .from("source_videos")
      .update({ status: "recue" })
      .eq("id", pending.entity_id)
      .eq("status", "envoi")
      .select("client_id, title")
      .maybeSingle();
    if (video) await notifyVideo(video.client_id, pending.entity_id, video.title, user.id);
  } else {
    // Session de l'utilisateur : la RLS vérifie qu'il peut modifier ce clip.
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("clips")
      .update({ storage_key: key, file_name: key.split("/").pop() })
      .eq("id", pending.entity_id);
    if (error) {
      logError("clips.attach_file", error);
      return { ok: false, error: "forbidden" };
    }
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
