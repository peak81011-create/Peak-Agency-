import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { notifyPermission, notifyUsers } from "@/lib/notifications";
import { serverEnv } from "@/lib/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Tâche quotidienne (Vercel Cron, voir vercel.json) : rappels de
// renouvellement, passage en délai de grâce puis en lecture seule.
// Protégée par CRON_SECRET (en-tête Authorization: Bearer …).

function authorized(request: NextRequest): boolean {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type LifecycleEvent = { client_id: string; event: "renewal_reminder" | "grace_started" | "read_only"; payment_id: string | null };

export async function GET(request: NextRequest) {
  if (!authorized(request)) return new NextResponse(null, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("run_subscription_lifecycle");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const events = (data ?? []) as LifecycleEvent[];

  for (const e of events) {
    const { data: client } = await admin
      .from("clients")
      .select("profile_id, creator_name, period_end")
      .eq("id", e.client_id)
      .single();
    if (!client) continue;

    if (e.event === "renewal_reminder" && e.payment_id) {
      const { data: payment } = await admin
        .from("payments")
        .select("reference, amount_cents, currency")
        .eq("id", e.payment_id)
        .single();
      if (payment) {
        await notifyUsers(
          [client.profile_id],
          "renewal_reminder",
          {
            reference: payment.reference,
            amount_cents: payment.amount_cents,
            currency: payment.currency,
            date_iso: client.period_end,
          },
          "/app/payment",
        );
      }
    } else if (e.event === "grace_started" || e.event === "read_only") {
      await notifyUsers([client.profile_id], e.event, { date_iso: client.period_end }, "/app/payment");
      await notifyPermission(
        "payments.validate",
        e.event === "grace_started" ? "client_grace_started" : "client_read_only",
        { client: client.creator_name },
        "/admin/payments?tab=pending",
      );
    }
  }
  return NextResponse.json({ ok: true, events: events.length });
}
