import { CircleCheck, Clock, Hourglass } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { OnboardingSteps } from "@/features/client/components/onboarding-header";
import { ProofUpload } from "@/features/client/components/proof-upload";
import { getOpenPayment } from "@/features/client/queries";
import { isUnlocked } from "@/features/client/status";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime, formatIban, formatMoney } from "@/lib/format";
import { getSettings, isBankConfigured } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("client.payment");
  return { title: t("title") };
}

function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card py-3 pl-4 pr-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-subtle-foreground">{label}</p>
        <p className="break-all font-mono text-base font-medium tracking-wide">{display ?? value}</p>
      </div>
      <CopyButton value={value} label={label} />
    </div>
  );
}

export default async function PaymentPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const client = user.client!;
  const t = await getTranslations("client.payment");
  const payment = await getOpenPayment(client.id);

  if (!payment) {
    // Rien à payer : accueil à poursuivre, ou espace déjà ouvert.
    redirect({ href: isUnlocked(client.status) ? "/app/billing" : "/app/plan", locale });
  }
  const p = payment!;
  const bank = await getSettings("bank");
  const planName = p.plan ? (locale === "en" ? p.plan.name_en : p.plan.name_fr) : "";
  const amount = formatMoney(p.amount_cents, p.currency, locale);

  return (
    <>
      <PageHeader
        eyebrow={t(p.kind === "renewal" ? "eyebrowRenewal" : "eyebrow")}
        title={t("title")}
        actions={<StatusBadge type="payment" value={p.status} />}
      />
      <PageBody>
        {!isUnlocked(client.status) ? <OnboardingSteps current="payment" /> : null}

        {p.status === "refuse" ? (
          <Callout tone="error">
            <p className="font-semibold">{t("refusedTitle")}</p>
            <p>{p.refusal_reason}</p>
            <p className="mt-1">{t("refusedHelp")}</p>
          </Callout>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
          <Card className="flex flex-col gap-4">
            <CardHeader className="mb-0">
              <CardTitle>{t("step1")}</CardTitle>
            </CardHeader>
            <p className="text-sm text-muted-foreground">{t("planLine", { plan: planName })}</p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-subtle-foreground">{t("amount")}</p>
              <p className="font-display text-4xl font-extrabold [font-stretch:115%]" data-testid="payment-amount">
                {amount}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 border-primary bg-muted px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.06em]">{t("reference")}</p>
                <p className="font-mono text-2xl font-semibold tracking-[0.06em] md:text-[28px]" data-testid="payment-reference">
                  {p.reference}
                </p>
                <p className="text-xs text-muted-foreground">{t("referenceHelp")}</p>
              </div>
              <CopyButton value={p.reference} label={t("reference")} />
            </div>
            {isBankConfigured(bank) ? (
              <div className="flex flex-col gap-2" data-testid="bank-details">
                <CopyRow label={t("holder")} value={bank.holder} />
                <CopyRow label={t("iban")} value={bank.iban.replace(/\s+/g, "")} display={formatIban(bank.iban)} />
                <CopyRow label={t("bic")} value={bank.bic} />
              </div>
            ) : (
              <Callout tone="warn">{t("bankMissing")}</Callout>
            )}
            <p className="text-xs text-subtle-foreground">{t("delayHint")}</p>
          </Card>

          <Card className="flex flex-col gap-4">
            <CardHeader className="mb-0">
              <CardTitle>{t("step2")}</CardTitle>
            </CardHeader>
            {p.status === "a_verifier" ? (
              <div className="flex flex-col gap-3">
                <Callout tone="info">
                  <p className="font-semibold">{t("reviewTitle")}</p>
                  <p>{t("reviewLead")}</p>
                </Callout>
                <ol className="flex flex-col gap-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CircleCheck className="size-5 text-t-green-fg" aria-hidden />
                    {t("timeline.uploaded", { date: formatDateTime(p.submitted_at, locale) })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Hourglass className="size-5 text-t-amber-fg" aria-hidden />
                    {t("timeline.review")}
                  </li>
                  <li className="flex items-center gap-2 text-subtle-foreground">
                    <Clock className="size-5" aria-hidden />
                    {t("timeline.unlocked")}
                  </li>
                </ol>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("proofHelp")}</p>
                <ProofUpload paymentId={p.id} />
              </>
            )}
          </Card>
        </div>
        <p className="text-sm text-muted-foreground">
          {t.rich("questions", { link: (chunks) => <Link href="/contact" className="text-forest-700">{chunks}</Link> })}
        </p>
      </PageBody>
    </>
  );
}
