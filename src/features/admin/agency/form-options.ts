import "server-only";
import { getTranslations } from "next-intl/server";
import { listAccounts, listVideos } from "@/features/agency/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { staffOptions } from "./queries";

/** Listes de choix des formulaires clip/compte (limitées par la RLS à ce que l'utilisateur voit). */
export async function clipFormOptions() {
  const supabase = await createSupabaseServerClient();
  const [{ data: clients }, videos, accounts, staff, tr] = await Promise.all([
    supabase.from("clients").select("id, creator_name").in("status", ["actif", "grace", "lecture_seule"]).order("creator_name"),
    listVideos({ limit: 500 }),
    listAccounts({}),
    staffOptions(),
    getTranslations("roles"),
  ]);
  return {
    clients: (clients ?? []).map((c) => ({ id: c.id as string, label: c.creator_name as string })),
    videos: videos.map((v) => ({ id: v.id, clientId: v.client_id, label: v.title || v.file_name || v.url || v.id })),
    accounts: accounts.map((a) => ({ id: a.id, clientId: a.client_id, label: `${a.platform} · ${a.handle}` })),
    editors: staff.map((s) => ({ id: s.id, label: `${s.full_name} · ${tr(s.role as "editor")}` })),
  };
}
