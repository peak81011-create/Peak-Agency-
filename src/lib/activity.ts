import "server-only";
import { clientIp } from "@/lib/security/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Inscrit une action importante dans le journal d'activité (qui, quoi, quand, sur quoi). */
export async function logActivity(entry: {
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await createSupabaseAdminClient()
    .from("activity_log")
    .insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
      ip: await clientIp(),
    });
}
