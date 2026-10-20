import { CircleCheck, Hourglass, Lock } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Stat } from "@/components/ui/stat";
import { ClipCard } from "@/features/agency/components/clip-card";
import { ViewsChart } from "@/features/agency/components/views-chart";
import { dailyViews, latestViews, listAccounts, listClips, listRequests } from "@/features/agency/queries";
import { getClientDetail } from "@/features/client/queries";
import { formatCompact } from "@/lib/format-number";
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

  const [detail, published, upcoming, accounts, openRequests, chart] = await Promise.all([
    getClientDetail(client.id),
    listClips({ clientId: client.id, statuses: ["publie"], order: "published" }),
    listClips({ clientId: client.id, statuses: ["planifie", "en_montage", "a_valider", "valide", "programme"], order: "upcoming" }),
    listAccounts({ clientId: client.id }),
    listRequests({ clientId: client.id, open: true }),
    dailyViews(client.id, 30),
  ]);
  const views = await latestViews(published.map((c) => c.id));
  const totalViews = [...views.values()].reduce((a, b) => a + b, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const publishedThisMonth = published.filter((c) => c.published_at && new Date(c.published_at) >= monthStart).length;
  const toValidate = upcoming.filter((c) => c.status === "a_valider");
  const followers = accounts.reduce((a, b) => a + b.followers_count, 0);
  const td = await getTranslations("client.dashboard");

  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date(), locale)}
        title={t("dashboard.welcome", { name })}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/requests" className={buttonVariants({ variant: "secondary" })}>
              {td("newRequest")}
            </Link>
            <Link href="/app/videos" className={buttonVariants()}>
              {td("sendVideo")}
            </Link>
          </div>
        }
      />
      <PageBody>
        {toValidate.length ? (
          <Callout tone="warn">
            {td("toValidate", { count: toValidate.length })}{" "}
            <Link href={`/app/clips/${toValidate[0].id}`} className="font-semibold underline">
              {td("validateNow")}
            </Link>
          </Callout>
        ) : null}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
          <Stat testId="stat-published" label={td("stats.published")} value={published.length} detail={td("stats.thisMonth", { count: publishedThisMonth })} />
          <Stat label={td("stats.upcoming")} value={upcoming.length} />
          <Stat label={td("stats.accounts")} value={accounts.length} detail={[...new Set(accounts.map((a) => a.platform))].join(", ")} />
          <Stat label={td("stats.views")} value={formatCompact(totalViews, locale)} />
          <Stat label={td("stats.followers")} value={formatCompact(followers, locale)} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{td("chartTitle")}</CardTitle>
            <StatusBadge type="client" value={client.status} />
          </CardHeader>
          <ViewsChart data={chart} locale={locale} label={td("stats.views")} />
          <p className="mt-3 text-xs text-subtle-foreground">
            {td("periodLine", {
              plan: detail?.plan ? (locale === "en" ? detail.plan.name_en : detail.plan.name_fr) : "—",
              end: formatDate(detail?.period_end ?? null, locale),
            })}
          </p>
        </Card>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{td("latestPublished")}</CardTitle>
              <Link href="/app/clips" className="text-sm font-semibold text-forest-700">
                {td("seeAll")}
              </Link>
            </CardHeader>
            {published.length === 0 ? <p className="text-sm text-muted-foreground">{td("noPublished")}</p> : null}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {published.slice(0, 4).map((c) => (
                <ClipCard key={c.id} clip={c} href={`/app/clips/${c.id}`} meta={formatDate(c.published_at, locale)} views={views.has(c.id) ? formatCompact(views.get(c.id)!, locale) : undefined} />
              ))}
            </div>
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{td("nextClips")}</CardTitle>
              </CardHeader>
              <ul className="flex flex-col gap-3 text-sm">
                {upcoming.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <Link href={`/app/clips/${c.id}`} className="min-w-0 truncate font-medium text-inherit no-underline">
                      {c.title}
                    </Link>
                    <StatusBadge type="clip" value={c.status} />
                  </li>
                ))}
                {upcoming.length === 0 ? <li className="text-muted-foreground">{td("noUpcoming")}</li> : null}
              </ul>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{td("openRequests")}</CardTitle>
              </CardHeader>
              <ul className="flex flex-col gap-3 text-sm">
                {openRequests.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <Link href={`/app/requests/${r.id}`} className="min-w-0 truncate font-medium text-inherit no-underline">
                      {r.title}
                    </Link>
                    <StatusBadge type="request" value={r.status} />
                  </li>
                ))}
                {openRequests.length === 0 ? <li className="text-muted-foreground">{td("noRequests")}</li> : null}
              </ul>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
