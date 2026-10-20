import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { listRequests } from "@/features/agency/queries";
import { RequestForm } from "@/features/client/components/request-form";
import { requireUnlockedClient } from "@/features/client/guard";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("requests");
  return { title: t("clientTitle") };
}

export default async function ClientRequestsPage() {
  const { client, writable } = await requireUnlockedClient();
  const [t, tt, locale, requests] = await Promise.all([
    getTranslations("requests"),
    getTranslations("requests.types"),
    getLocale(),
    listRequests({ clientId: client.id }),
  ]);

  return (
    <>
      <PageHeader title={t("clientTitle")} />
      <PageBody>
        <p className="text-muted-foreground">{t("clientLead")}</p>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6">
          <Card className="p-0 md:p-0">
            <h2 className="px-4 pt-4 text-base font-semibold md:px-5 md:pt-5">{t("list")}</h2>
            {requests.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p> : null}
            <ul className="mt-3 divide-y divide-sage-100" data-testid="request-list">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/app/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-inherit no-underline hover:bg-paper md:px-5">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.title}</span>
                      <span className="text-xs text-subtle-foreground">
                        #R-{r.number} · {tt(r.type)} · {formatDate(r.created_at, locale)}
                      </span>
                    </span>
                    <StatusBadge type="request" value={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("new")}</CardTitle>
            </CardHeader>
            {writable ? <RequestForm /> : <Callout tone="warn">{t("readOnly")}</Callout>}
          </Card>
        </div>
      </PageBody>
    </>
  );
}
