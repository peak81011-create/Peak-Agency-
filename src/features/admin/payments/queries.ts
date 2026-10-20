import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminPaymentRow = {
  id: string;
  reference: string;
  amount_cents: number;
  currency: string;
  status: "en_attente" | "a_verifier" | "valide" | "refuse";
  kind: "initial" | "renewal";
  submitted_at: string | null;
  validated_at: string | null;
  refusal_reason: string | null;
  proof_path: string | null;
  proof_mime: string | null;
  created_at: string;
  client: { id: string; creator_name: string; profile: { full_name: string; email: string } | null } | null;
  plan: { name_fr: string; name_en: string } | null;
  invoice: { id: string; number: string } | null;
};

const COLUMNS =
  "id, reference, amount_cents, currency, status, kind, submitted_at, validated_at, refusal_reason, proof_path, proof_mime, created_at, client:clients(id, creator_name, profile:profiles(full_name, email)), plan:plans(name_fr, name_en), invoice:invoices(id, number)";

export const PAYMENT_TABS = { review: ["a_verifier"], pending: ["en_attente", "refuse"], history: ["valide", "refuse"] } as const;
export type PaymentTab = keyof typeof PAYMENT_TABS;

/** Paiements visibles par l'utilisateur (RLS), filtrés par onglet. */
export async function listPayments(tab: PaymentTab, limit = 200): Promise<AdminPaymentRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payments")
    .select(COLUMNS)
    .in("status", [...PAYMENT_TABS[tab]])
    .order(tab === "review" ? "submitted_at" : "created_at", { ascending: tab === "review" })
    .limit(limit);
  return (data ?? []) as unknown as AdminPaymentRow[];
}

export async function getPayment(id: string): Promise<AdminPaymentRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("payments").select(COLUMNS).eq("id", id).maybeSingle();
  return (data as unknown as AdminPaymentRow | null) ?? null;
}

export async function countPayments(): Promise<Record<PaymentTab, number>> {
  const supabase = await createSupabaseServerClient();
  const count = async (statuses: readonly string[]) =>
    (await supabase.from("payments").select("id", { count: "exact", head: true }).in("status", [...statuses])).count ?? 0;
  const [review, pending, history] = await Promise.all([
    count(PAYMENT_TABS.review),
    count(PAYMENT_TABS.pending),
    count(PAYMENT_TABS.history),
  ]);
  return { review, pending, history };
}
