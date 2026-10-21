import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Lectures de l'espace client, toujours avec la session de l'utilisateur
// (la RLS limite chaque requête à ses propres données).

export type PlanRow = {
  id: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  price_cents: number;
  currency: string;
  billing_period: "mensuel" | "trimestriel" | "annuel" | "unique";
  clips_per_period: number | null;
  accounts_included: number | null;
  platforms: string[];
  delivery_days: number | null;
  features_fr: string[];
  features_en: string[];
  sort_order: number;
  is_visible: boolean;
  is_featured: boolean;
  is_demo: boolean;
  slug: string | null;
  tagline_fr: string;
  tagline_en: string;
  clip_length_fr: string;
  clip_length_en: string;
  details_fr: string;
  details_en: string;
};

export const PLAN_COLUMNS =
  "id, name_fr, name_en, description_fr, description_en, price_cents, currency, billing_period, clips_per_period, accounts_included, platforms, delivery_days, features_fr, features_en, sort_order, is_visible, is_featured, is_demo, slug, tagline_fr, tagline_en, clip_length_fr, clip_length_en, details_fr, details_en";

export async function getVisiblePlans(): Promise<PlanRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("plans").select(PLAN_COLUMNS).eq("is_visible", true).order("sort_order");
  return (data ?? []) as PlanRow[];
}

export type PaymentRow = {
  id: string;
  reference: string;
  amount_cents: number;
  currency: string;
  status: "en_attente" | "a_verifier" | "valide" | "refuse";
  kind: "initial" | "renewal";
  refusal_reason: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  period_start: string | null;
  period_end: string | null;
  proof_path: string | null;
  plan: { name_fr: string; name_en: string } | null;
  invoice: { id: string; number: string } | null;
};

const PAYMENT_COLUMNS =
  "id, reference, amount_cents, currency, status, kind, refusal_reason, submitted_at, validated_at, period_start, period_end, proof_path, plan:plans(name_fr, name_en), invoice:invoices(id, number)";

/** Paiement en cours (en attente, à vérifier ou refusé), s'il y en a un. */
export async function getOpenPayment(clientId: string): Promise<PaymentRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("client_id", clientId)
    .in("status", ["en_attente", "a_verifier", "refuse"])
    .maybeSingle();
  return (data as unknown as PaymentRow | null) ?? null;
}

export async function getPayments(clientId: string): Promise<PaymentRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as PaymentRow[];
}

export type ClientDetail = {
  id: string;
  creator_name: string;
  niche: string | null;
  language: string | null;
  channels: Record<string, string>;
  goals: string | null;
  live_availability: string | null;
  billing_address: string | null;
  status: string;
  plan_id: string | null;
  custom_price_cents: number | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  plan: { name_fr: string; name_en: string; price_cents: number; currency: string; billing_period: string } | null;
};

export async function getClientDetail(clientId: string): Promise<ClientDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, creator_name, niche, language, channels, goals, live_availability, billing_address, status, plan_id, custom_price_cents, period_start, period_end, created_at, plan:plans(name_fr, name_en, price_cents, currency, billing_period)",
    )
    .eq("id", clientId)
    .maybeSingle();
  return (data as unknown as ClientDetail | null) ?? null;
}
