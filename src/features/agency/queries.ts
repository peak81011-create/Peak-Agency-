import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Lectures partagées espace client / espace équipe. Toujours avec la session
// de l'utilisateur : la RLS limite les résultats à ce qu'il a le droit de voir.

export type ClipStatus = "planifie" | "en_montage" | "a_valider" | "valide" | "programme" | "publie" | "rejete";
export type VideoStatus = "envoi" | "recue" | "en_traitement" | "clips_extraits" | "archivee" | "erreur";
export type Platform = "tiktok" | "instagram" | "youtube" | "autre";

export type ClipRow = {
  id: string;
  client_id: string;
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  status: ClipStatus;
  start_seconds: number | null;
  end_seconds: number | null;
  storage_key: string | null;
  file_name: string | null;
  due_at: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string | null;
  client_feedback: string | null;
  clipper_id: string | null;
  source_video_id: string | null;
  social_account_id: string | null;
  created_at: string;
  account: { handle: string; platform: Platform } | null;
  clipper: { full_name: string } | null;
  client: { creator_name: string } | null;
  video: { title: string } | null;
};

export const CLIP_COLUMNS =
  "id, client_id, title, hook, caption, hashtags, status, start_seconds, end_seconds, storage_key, file_name, due_at, scheduled_at, published_at, published_url, client_feedback, clipper_id, source_video_id, social_account_id, created_at, account:social_accounts(handle, platform), clipper:profiles!clips_clipper_id_fkey(full_name), client:clients(creator_name), video:source_videos(title)";

export async function listClips(filter: {
  clientId?: string;
  statuses?: ClipStatus[];
  clipperId?: string;
  order?: "published" | "upcoming" | "recent";
  limit?: number;
}): Promise<ClipRow[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("clips").select(CLIP_COLUMNS);
  if (filter.clientId) q = q.eq("client_id", filter.clientId);
  if (filter.clipperId) q = q.eq("clipper_id", filter.clipperId);
  if (filter.statuses?.length) q = q.in("status", filter.statuses);
  if (filter.order === "published") q = q.order("published_at", { ascending: false, nullsFirst: false });
  else if (filter.order === "upcoming") q = q.order("scheduled_at", { ascending: true, nullsFirst: false }).order("due_at", { ascending: true });
  else q = q.order("created_at", { ascending: false });
  const { data } = await q.limit(filter.limit ?? 200);
  return (data ?? []) as unknown as ClipRow[];
}

export async function getClip(id: string): Promise<ClipRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("clips").select(CLIP_COLUMNS).eq("id", id).maybeSingle();
  return (data as unknown as ClipRow | null) ?? null;
}

export type VideoRow = {
  id: string;
  client_id: string;
  title: string;
  kind: "fichier" | "lien";
  url: string | null;
  file_name: string | null;
  size_bytes: number | null;
  recorded_at: string | null;
  notes: string;
  priority: "basse" | "normale" | "haute";
  status: VideoStatus;
  created_at: string;
  client: { creator_name: string } | null;
  clips: { count: number }[];
};

const VIDEO_COLUMNS =
  "id, client_id, title, kind, url, file_name, size_bytes, recorded_at, notes, priority, status, created_at, client:clients(creator_name), clips(count)";

export async function listVideos(filter: { clientId?: string; statuses?: VideoStatus[]; limit?: number }): Promise<VideoRow[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("source_videos").select(VIDEO_COLUMNS);
  if (filter.clientId) q = q.eq("client_id", filter.clientId);
  if (filter.statuses?.length) q = q.in("status", filter.statuses);
  const { data } = await q.order("created_at", { ascending: false }).limit(filter.limit ?? 200);
  return (data ?? []) as unknown as VideoRow[];
}

export type AccountRow = {
  id: string;
  client_id: string;
  platform: Platform;
  handle: string;
  url: string | null;
  created_on: string | null;
  status: "actif" | "en_croissance" | "bloque" | "abandonne";
  followers_count: number;
  owner_employee_id: string | null;
  client: { creator_name: string } | null;
  owner: { full_name: string } | null;
  clips: { count: number }[];
};

const ACCOUNT_COLUMNS =
  "id, client_id, platform, handle, url, created_on, status, followers_count, owner_employee_id, client:clients(creator_name), owner:profiles!social_accounts_owner_employee_id_fkey(full_name), clips(count)";

export async function listAccounts(filter: { clientId?: string }): Promise<AccountRow[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("social_accounts").select(ACCOUNT_COLUMNS);
  if (filter.clientId) q = q.eq("client_id", filter.clientId);
  const { data } = await q.order("created_at", { ascending: true });
  return (data ?? []) as unknown as AccountRow[];
}

export type RequestRow = {
  id: string;
  number: number;
  client_id: string;
  type: "clip" | "style" | "nouveau_compte" | "modification" | "autre";
  title: string;
  description: string;
  desired_due_date: string | null;
  status: "nouvelle" | "en_cours" | "terminee" | "refusee";
  priority: "basse" | "normale" | "haute";
  assigned_to: string | null;
  converted_clip_id: string | null;
  created_at: string;
  updated_at: string;
  client: { creator_name: string } | null;
  assignee: { full_name: string } | null;
};

const REQUEST_COLUMNS =
  "id, number, client_id, type, title, description, desired_due_date, status, priority, assigned_to, converted_clip_id, created_at, updated_at, client:clients(creator_name), assignee:profiles!requests_assigned_to_fkey(full_name)";

export async function listRequests(filter: { clientId?: string; open?: boolean; assignedTo?: string }): Promise<RequestRow[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("requests").select(REQUEST_COLUMNS);
  if (filter.clientId) q = q.eq("client_id", filter.clientId);
  if (filter.assignedTo) q = q.eq("assigned_to", filter.assignedTo);
  if (filter.open === true) q = q.in("status", ["nouvelle", "en_cours"]);
  if (filter.open === false) q = q.in("status", ["terminee", "refusee"]);
  const { data } = await q.order("updated_at", { ascending: false }).limit(300);
  return (data ?? []) as unknown as RequestRow[];
}

export async function getRequest(id: string): Promise<RequestRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("requests").select(REQUEST_COLUMNS).eq("id", id).maybeSingle();
  return (data as unknown as RequestRow | null) ?? null;
}

export type CommentRow = {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author_id: string | null;
  attachments: { path: string; name: string }[];
  author: { full_name: string; role: string } | null;
};

export async function listComments(entityType: "clip" | "request" | "video" | "client", entityId: string): Promise<CommentRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("comments")
    .select("id, body, is_internal, created_at, author_id, attachments, author:profiles(full_name, role)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as CommentRow[];
}

/** Dernières vues connues par clip (relevés), pour les clips donnés. */
export async function latestViews(clipIds: string[]): Promise<Map<string, number>> {
  if (!clipIds.length) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("clip_latest_stats").select("clip_id, views").in("clip_id", clipIds);
  return new Map((data ?? []).map((r) => [r.clip_id as string, Number(r.views)]));
}

/** Vues totales par jour sur N jours (somme du dernier relevé connu de chaque clip ce jour-là). */
export async function dailyViews(clientId: string, days = 30): Promise<{ day: string; views: number }[]> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await supabase
    .from("clip_stats_snapshots")
    .select("clip_id, captured_at, views, clip:clips!inner(client_id)")
    .eq("clip.client_id", clientId)
    .order("captured_at", { ascending: true });
  const rows = (data ?? []) as unknown as { clip_id: string; captured_at: string; views: number }[];
  const latest = new Map<string, number>();
  const out: { day: string; views: number }[] = [];
  let i = 0;
  for (let d = days; d >= 0; d--) {
    const end = new Date(Date.now() - d * 86_400_000);
    const dayKey = end.toISOString().slice(0, 10);
    while (i < rows.length && rows[i].captured_at.slice(0, 10) <= dayKey) {
      latest.set(rows[i].clip_id, Number(rows[i].views));
      i++;
    }
    if (end.toISOString() >= since) out.push({ day: dayKey, views: [...latest.values()].reduce((a, b) => a + b, 0) });
  }
  return out;
}
