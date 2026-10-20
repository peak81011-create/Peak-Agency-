import { NextResponse } from "next/server";
import { can, getSessionUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Export CSV de l'historique des paiements (lecture avec la session : RLS).
export async function GET() {
  const user = await getSessionUser();
  if (!(await can(user, "payments.validate"))) return new NextResponse(null, { status: 403 });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payments")
    .select("reference, status, kind, amount_cents, currency, submitted_at, validated_at, period_start, period_end, refusal_reason, client:clients(creator_name), invoice:invoices(number)")
    .order("created_at", { ascending: false });
  type Row = {
    reference: string;
    status: string;
    kind: string;
    amount_cents: number;
    currency: string;
    submitted_at: string | null;
    validated_at: string | null;
    period_start: string | null;
    period_end: string | null;
    refusal_reason: string | null;
    client: { creator_name: string } | null;
    invoice: { number: string } | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).map((r) => [
    r.reference,
    r.client?.creator_name,
    r.status,
    r.kind,
    (r.amount_cents / 100).toFixed(2).replace(".", ","),
    r.currency,
    r.submitted_at,
    r.validated_at,
    r.period_start,
    r.period_end,
    r.invoice?.number,
    r.refusal_reason,
  ]);
  const csv = toCsv(
    ["reference", "client", "statut", "type", "montant", "devise", "depose_le", "valide_le", "debut_periode", "fin_periode", "facture", "motif_refus"],
    rows,
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paiements-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
