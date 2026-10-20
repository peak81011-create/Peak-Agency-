import { FileDown } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getClientDetail, getOpenPayment, getPayments } from "@/features/client/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { isUnlocked } from "@/features/client/status";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("client.billing");
  return { title: t("title") };
}

export default async function BillingPage() {
  const user = await requireUser();
  const locale = await getLocale();
  // Espace verrouillé tant que le paiement n'est pas validé (profil, offre et paiement seulement).
  if (!isUnlocked(user.client!.status)) redirect({ href: "/app", locale });
  const t = await getTranslations("client.billing");
  const [client, payments, open] = await Promise.all([
    getClientDetail(user.client!.id),
    getPayments(user.client!.id),
    getOpenPayment(user.client!.id),
  ]);
  const plan = client?.plan;

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <Card>
          <CardHeader>
            <CardTitle>{t("currentPlan")}</CardTitle>
            {client ? <StatusBadge type="client" value={client.status as never} /> : null}
          </CardHeader>
          <dl className="grid grid-cols-1 gap-x-5 gap-y-1 text-sm md:grid-cols-[minmax(140px,auto)_1fr] md:gap-y-2.5">
            <dt className="text-subtle-foreground">{t("plan")}</dt>
            <dd className="mb-2 font-medium md:mb-0">
              {plan
                ? `${locale === "en" ? plan.name_en : plan.name_fr} · ${formatMoney(client?.custom_price_cents ?? plan.price_cents, plan.currency, locale)}`
                : "—"}
            </dd>
            <dt className="text-subtle-foreground">{t("period")}</dt>
            <dd className="mb-2 font-medium md:mb-0">
              {client?.period_start ? `${formatDate(client.period_start, locale)} → ${formatDate(client.period_end, locale)}` : "—"}
            </dd>
          </dl>
          {open ? (
            <Link href="/app/payment" className={buttonVariants({ className: "mt-4" })}>
              {t("payNow")}
            </Link>
          ) : null}
        </Card>

        <Card className="p-0 md:p-0">
          <h2 className="px-4 pt-4 text-base font-semibold md:px-5 md:pt-5">{t("history")}</h2>
          {payments.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-sage-50 text-left text-xs uppercase tracking-[0.04em] text-subtle-foreground">
                    <th className="px-4 py-3 font-semibold">{t("cols.reference")}</th>
                    <th className="px-4 py-3 font-semibold">{t("cols.period")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("cols.amount")}</th>
                    <th className="px-4 py-3 font-semibold">{t("cols.status")}</th>
                    <th className="px-4 py-3 font-semibold">{t("cols.invoice")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-sage-100 last:border-0">
                      <td className="px-4 py-3 font-mono">{p.reference}</td>
                      <td className="px-4 py-3">
                        {p.period_start ? `${formatDate(p.period_start, locale)} → ${formatDate(p.period_end, locale)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.amount_cents, p.currency, locale)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge type="payment" value={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        {p.invoice ? (
                          <a
                            href={`/api/invoices/${p.invoice.id}`}
                            className="inline-flex items-center gap-1.5 font-semibold text-forest-700"
                          >
                            <FileDown className="size-4" aria-hidden />
                            {p.invoice.number}
                          </a>
                        ) : (
                          <span className="text-subtle-foreground">{p.status === "valide" ? "—" : t("afterValidation")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
