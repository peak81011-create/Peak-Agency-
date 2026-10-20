import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlatformBadge } from "@/components/ui/platform-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAccounts } from "@/features/agency/queries";
import { requireUnlockedClient } from "@/features/client/guard";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { formatCompact } from "@/lib/format-number";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounts");
  return { title: t("clientTitle") };
}

export default async function ClientAccountsPage() {
  const { client } = await requireUnlockedClient();
  const [t, locale, accounts] = await Promise.all([getTranslations("accounts"), getLocale(), listAccounts({ clientId: client.id })]);

  return (
    <>
      <PageHeader title={t("clientTitle")} />
      <PageBody>
        <p className="text-muted-foreground">{t("clientLead")}</p>
        {accounts.length === 0 ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="account-list">
          {accounts.map((a) => (
            <Card key={a.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <PlatformBadge platform={a.platform} />
                <StatusBadge type="account" value={a.status} />
              </div>
              <div>
                <p className="text-lg font-semibold">{a.handle}</p>
                <p className="text-xs text-subtle-foreground">{t("createdOn", { date: formatDate(a.created_on, locale) })}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("followers")}</dt>
                  <dd className="font-display text-2xl font-bold tabular-nums [font-stretch:112%]">{formatCompact(a.followers_count, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("clipsPosted")}</dt>
                  <dd className="font-display text-2xl font-bold tabular-nums [font-stretch:112%]">{a.clips?.[0]?.count ?? 0}</dd>
                </div>
              </dl>
              {a.url ? (
                <a href={a.url} target="_blank" rel="noreferrer noopener" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  <ExternalLink aria-hidden />
                  {t("open")}
                </a>
              ) : null}
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {t.rich("credentialsNote", { link: (chunks) => <Link href="/app/requests" className="font-semibold text-forest-700">{chunks}</Link> })}
        </p>
      </PageBody>
    </>
  );
}
