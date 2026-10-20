import "server-only";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Limite le nombre d'actions par fenêtre de temps (stocké en base, fonctionne
 * sur plusieurs instances Vercel). Renvoie true si l'action est autorisée.
 */
export async function rateLimit(bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  const key = `${bucket}:${await clientIp()}`;
  // Multiplicateur pour les tests automatisés (nombreuses connexions depuis la même IP).
  const factor = Math.max(1, Number(process.env.RATE_LIMIT_FACTOR ?? 1) || 1);
  const { data, error } = await createSupabaseAdminClient().rpc("rate_limit_hit", {
    p_key: key,
    p_max: max * factor,
    p_window_seconds: windowSeconds,
  });
  // En cas de panne de la base, on bloque plutôt que de laisser passer.
  if (error) return false;
  return data === true;
}

export const RATE_LIMITS = {
  login: { max: 10, windowSeconds: 15 * 60 },
  signup: { max: 5, windowSeconds: 60 * 60 },
  passwordReset: { max: 5, windowSeconds: 60 * 60 },
  mfa: { max: 10, windowSeconds: 15 * 60 },
} as const;
