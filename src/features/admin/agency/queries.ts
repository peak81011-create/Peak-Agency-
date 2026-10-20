import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffOption = { id: string; full_name: string; role: string };

/** Membres actifs de l'équipe (pour les listes « monteur », « attribuer à »…). */
export async function staffOptions(): Promise<StaffOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("id, full_name, role").neq("role", "client").eq("is_active", true).order("full_name");
  return (data ?? []) as StaffOption[];
}

export type ClientListRow = {
  id: string;
  creator_name: string;
  niche: string | null;
  status: string;
  period_end: string | null;
  custom_price_cents: number | null;
  created_at: string;
  plan: { name_fr: string; name_en: string; price_cents: number; currency: string } | null;
  profile: { full_name: string; email: string } | null;
  assignments: { user_id: string; team_role: string; user: { full_name: string } | null }[];
};

export async function listClientsAdmin(filter: { status?: string; q?: string }): Promise<ClientListRow[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("clients")
    .select(
      "id, creator_name, niche, status, period_end, custom_price_cents, created_at, plan:plans(name_fr, name_en, price_cents, currency), profile:profiles(full_name, email), assignments(user_id, team_role, user:profiles(full_name))",
    );
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.q) q = q.ilike("creator_name", `%${filter.q.replace(/[%_]/g, "")}%`);
  const { data } = await q.order("created_at", { ascending: false }).limit(500);
  return (data ?? []) as unknown as ClientListRow[];
}

export type ClientFile = ClientListRow & {
  language: string | null;
  channels: Record<string, string>;
  goals: string | null;
  live_availability: string | null;
  billing_address: string | null;
  plan_id: string | null;
  period_start: string | null;
  requires_client_validation: boolean;
  profile_id: string;
};

export async function getClientFile(id: string): Promise<ClientFile | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, profile_id, creator_name, niche, language, channels, goals, live_availability, billing_address, status, plan_id, period_start, period_end, custom_price_cents, requires_client_validation, created_at, plan:plans(name_fr, name_en, price_cents, currency), profile:profiles(full_name, email), assignments(user_id, team_role, user:profiles(full_name))",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as ClientFile | null) ?? null;
}

export type ActivityRow = { id: string; action: string; created_at: string; actor: { full_name: string } | null; metadata: Record<string, unknown> };

export async function clientActivity(clientId: string, limit = 20): Promise<ActivityRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("activity_log")
    .select("id, action, created_at, metadata, actor:profiles(full_name)")
    .eq("entity_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ActivityRow[];
}
