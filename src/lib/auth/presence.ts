import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const THROTTLE_MS = 5 * 60 * 1000;

/** Met à jour « dernière connexion » au plus toutes les 5 minutes. */
export async function touchLastSeen(userId: string): Promise<void> {
  const threshold = new Date(Date.now() - THROTTLE_MS).toISOString();
  await createSupabaseAdminClient()
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId)
    .or(`last_seen_at.is.null,last_seen_at.lt.${threshold}`);
}
