import { Download, FileText, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaymentReview } from "@/features/admin/payments/payment-review";
import { countPayments, getPayment, listPayments, PAYMENT_TABS, type PaymentTab } from "@/features/admin/payments/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getSettings, missingInvoiceFields } from "@/lib/settings";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.payments");
  return { title: t("title") };
}

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string; id?: string }> }) {
  await requirePermission("payments.validate");
  const locale = await getLocale();
  const t = await getTranslations("admin.payments");
  const params = await searchParams;
  const tab: PaymentTab = params.tab && params.tab in PAYMENT_TABS ? (params.tab as PaymentTab) : "review";

  const [rows, counts, company] = await Promise.all([listPayments(tab), countPayments(), getSettings("company")]);
  const selectedId = params.id ?? (tab === "review" ? rows[0]?.id : undefined);
  const selected = selectedId ? await getPayment(selectedId) : null;
  const missing = missingInvoiceFields(company);
  const who = (r: (typeof rows)[number]) => r.client?.creator_name || r.client?.profile?.full_name || "—";

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <a href="/api/exports/payments" download className={buttonVariants({ variant: "secondary" })}>
            <Download aria-hidden />
            {t("export")}
          </a>
        }
      />
      <PageBody>
        {missing.length ? (
          <Callout tone="warn">
            {t("companyMissing")}{" "}
            <Link href="/admin/settings" className="font-semibold underline">
              {t("goToSettings")}
            </Link>
          </Callout>
        ) : null}

        <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label={t("title")}>
          {(Object.keys(PAYMENT_TABS) as PaymentTab[]).map((key) => (
            <Link
              key={key}
              href={{ pathname: "/admin/payments", query: { tab: key } }}
              aria-current={key === tab ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium no-underline",
                key === tab ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-primary",
              )}
            >
              {t(`tabs.${key}`)}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{counts[key]}</span>
            </Link>
          ))}
        </nav>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-6">
          <Card className="p-0 md:p-0">
            {rows.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <ul className="divide-y divide-sage-100" data-testid="payment-list">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={{ pathname: "/admin/payments", query: { tab, id: r.id } }}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm no-underline hover:bg-paper",
                        r.id === selected?.id && "bg-sage-50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">{who(r)}</span>
                        <span className="font-mono text-xs text-subtle-foreground">{r.reference}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums text-foreground">
                          {formatMoney(r.amount_cents, r.currency, locale)}
                        </span>
                        <StatusBadge type="payment" value={r.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {selected ? (
            <Card className="flex flex-col gap-4" data-testid="payment-detail">
              <CardHeader className="mb-0">
                <CardTitle>{who(selected)}</CardTitle>
                <StatusBadge type="payment" value={selected.status} />
              </CardHeader>
              <p className="-mt-2 text-sm text-muted-foreground">
                {t(selected.kind === "renewal" ? "kindRenewal" : "kindInitial")} ·{" "}
                {selected.plan ? (locale === "en" ? selected.plan.name_en : selected.plan.name_fr) : "—"} ·{" "}
                {t("submitted", { date: formatDateTime(selected.submitted_at, locale) })}
              </p>

              {selected.status === "a_verifier" ? (
                <div role="alert" className="flex items-start gap-3 rounded-md bg-t-amber-bg px-4 py-3.5 text-sm text-t-amber-fg">
                  <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                  <span className="font-semibold">{t("bankReminder")}</span>
                </div>
              ) : null}

              <dl className="grid grid-cols-1 gap-x-5 gap-y-1 text-sm md:grid-cols-[minmax(140px,auto)_1fr] md:gap-y-2.5">
                <dt className="text-subtle-foreground">{t("expectedAmount")}</dt>
                <dd className="mb-2 font-display text-xl font-bold md:mb-0">
                  {formatMoney(selected.amount_cents, selected.currency, locale)}
                </dd>
                <dt className="text-subtle-foreground">{t("expectedReference")}</dt>
                <dd className="mb-2 font-mono font-semibold md:mb-0">{selected.reference}</dd>
                {selected.refusal_reason ? (
                  <>
                    <dt className="text-subtle-foreground">{t("refusalReason")}</dt>
                    <dd className="mb-2 md:mb-0">{selected.refusal_reason}</dd>
                  </>
                ) : null}
                {selected.invoice ? (
                  <>
                    <dt className="text-subtle-foreground">{t("invoice")}</dt>
                    <dd>
                      <a href={`/api/invoices/${selected.invoice.id}`} className="inline-flex items-center gap-1.5 font-semibold text-forest-700">
                        <FileText className="size-4" aria-hidden />
                        {selected.invoice.number}
                      </a>
                    </dd>
                  </>
                ) : null}
              </dl>

              {selected.proof_path ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] font-semibold">{t("proof")}</p>
                  {selected.proof_mime?.startsWith("image/") ? (
                    <a href={`/api/payments/${selected.id}/proof`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/payments/${selected.id}/proof`}
                        alt={t("proofAlt", { reference: selected.reference })}
                        className="max-h-96 w-full rounded-md border border-border bg-paper object-contain"
                      />
                    </a>
                  ) : null}
                  <a
                    href={`/api/payments/${selected.id}/proof?download`}
                    className={buttonVariants({ variant: "secondary", size: "sm", className: "self-start" })}
                  >
                    <Download aria-hidden />
                    {t("downloadProof")}
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noProof")}</p>
              )}

              {selected.status === "a_verifier" || selected.status === "en_attente" ? <PaymentReview paymentId={selected.id} /> : null}
            </Card>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
