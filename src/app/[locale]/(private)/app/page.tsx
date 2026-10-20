import { CircleCheck, Hourglass, Lock } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getClientDetail } from "@/features/client/queries";
import { isUnlocked, nextOnboardingStep, STEP_PATHS } from "@/features/client/status";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

export default async function ClientDashboardPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const client = user.client!;
  const t = await getTranslations();
  const name = client.creatorName || user.fullName || user.email;

  if (client.status === "suspendu" || client.status === "archive") {
    return (
      <>
        <PageHeader eyebrow={t("areas.client")} title={t("dashboard.welcome", { name })} />
        <PageBody>
          <Callout tone="warn">{t("client.dashboard.suspended")}</Callout>
        </PageBody>
      </>
    );
  }

  const step = nextOnboardingStep(client);
  // Accueil non terminé : on emmène directement à l'étape suivante, sauf pendant la vérification.
  if (step && client.status !== "paiement_a_verifier") redirect({ href: STEP_PATHS[step], locale });

  if (!isUnlocked(client.status)) {
    const lockedFeatures = ["dashboard", "upload", "clips", "accounts"] as const;
    return (
      <>
        <PageHeader eyebrow={t("areas.client")} title={t("client.dashboard.reviewTitle", { name })} />
        <PageBody>
          <Callout tone="info">{t("dashboard.clientLockedTitle")}</Callout>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("client.dashboard.checklist")}</CardTitle>
                <StatusBadge type="client" value={client.status} />
              </CardHeader>
              <ol className="flex flex-col gap-3 text-sm">
                {(["profile", "plan", "proof"] as const).map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <CircleCheck className="size-5 text-t-green-fg" aria-hidden />
                    {t(`client.dashboard.done.${k}`)}
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <Hourglass className="size-5 text-t-amber-fg" aria-hidden />
                  {t("client.dashboard.reviewing")}
                </li>
              </ol>
              <Link href="/app/payment" className={buttonVariants({ variant: "secondary", className: "mt-5" })}>
                {t("client.dashboard.seePayment")}
              </Link>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("client.dashboard.afterUnlock")}</CardTitle>
              </CardHeader>
              <ul className="flex flex-col gap-3 text-sm">
                {lockedFeatures.map((k) => (
                  <li key={k} className="flex items-start gap-2 text-muted-foreground">
                    <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold text-foreground">{t(`client.dashboard.features.${k}.title`)}</span> —{" "}
                      {t(`client.dashboard.features.${k}.body`)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </PageBody>
      </>
    );
  }

  const detail = await getClientDetail(client.id);
  return (
    <>
      <PageHeader eyebrow={t("areas.client")} title={t("dashboard.welcome", { name })} />
      <PageBody>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.clientStatus")}</CardTitle>
            <StatusBadge type="client" value={client.status} />
          </CardHeader>
          <p className="text-sm text-muted-foreground">
            {t("client.dashboard.periodLine", {
              plan: detail?.plan ? (locale === "en" ? detail.plan.name_en : detail.plan.name_fr) : "—",
              end: formatDate(detail?.period_end ?? null, locale),
            })}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{t("common.comingSoon")}</p>
        </Card>
      </PageBody>
    </>
  );
}
