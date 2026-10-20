import { NextResponse } from "next/server";
import { can, getSessionUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Export CSV des clients visibles par l'utilisateur (RLS).
export async function GET() {
  const user = await getSessionUser();
  if (!(await can(user, "clients.read"))) return new NextResponse(null, { status: 403 });
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select("creator_name, niche, language, status, period_start, period_end, custom_price_cents, created_at, plan:plans(name_fr), profile:profiles(full_name, email)")
    .order("created_at", { ascending: false });
  type Row = {
    creator_name: string;
    niche: string | null;
    language: string | null;
    status: string;
    period_start: string | null;
    period_end: string | null;
    custom_price_cents: number | null;
    created_at: string;
    plan: { name_fr: string } | null;
    profile: { full_name: string; email: string } | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).map((r) => [
    r.creator_name,
    r.profile?.full_name,
    r.profile?.email,
    r.niche,
    r.language,
    r.status,
    r.plan?.name_fr,
    r.custom_price_cents != null ? (r.custom_price_cents / 100).toFixed(2).replace(".", ",") : "",
    r.period_start,
    r.period_end,
    r.created_at,
  ]);
  const csv = toCsv(["createur", "nom", "email", "niche", "langue", "statut", "offre", "tarif_personnalise", "debut", "fin", "inscrit_le"], rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
