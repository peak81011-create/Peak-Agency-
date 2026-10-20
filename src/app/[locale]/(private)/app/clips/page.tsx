import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TONES } from "@/components/ui/badge";
import { ClipCard } from "@/features/agency/components/clip-card";
import { MonthCalendar } from "@/features/agency/components/month-calendar";
import { latestViews, listClips, type ClipStatus } from "@/features/agency/queries";
import { requireUnlockedClient } from "@/features/client/guard";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatCompact } from "@/lib/format-number";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clips");
  return { title: t("clientTitle") };
}

const UPCOMING: ClipStatus[] = ["planifie", "en_montage", "a_valider", "valide", "programme"];
const EVENT_TONES: Partial<Record<ClipStatus, string>> = {
  programme: TONES.violet,
  a_valider: TONES.amber,
  en_montage: TONES.blue,
  valide: TONES.teal,
  planifie: TONES.neutral,
};

export default async function ClientClipsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { client } = await requireUnlockedClient();
  const { view = "published" } = await searchParams;
  const [t, locale, published, upcoming] = await Promise.all([
    getTranslations("clips"),
    getLocale(),
    listClips({ clientId: client.id, statuses: ["publie"], order: "published" }),
    listClips({ clientId: client.id, statuses: UPCOMING, order: "upcoming" }),
  ]);
  const views = await latestViews(published.map((c) => c.id));
  const tabs = [
    { key: "published", label: t("tabs.published"), count: published.length },
    { key: "upcoming", label: t("tabs.upcoming"), count: upcoming.length },
    { key: "calendar", label: t("tabs.calendar"), count: null },
  ];

  return (
    <>
      <PageHeader title={t("clientTitle")} />
      <PageBody>
        <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label={t("clientTitle")}>
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={{ pathname: "/app/clips", query: { view: tab.key } }}
              aria-current={view === tab.key ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium no-underline",
                view === tab.key ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground",
              )}
            >
              {tab.label}
              {tab.count !== null ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{tab.count}</span> : null}
            </Link>
          ))}
        </nav>

        {view === "upcoming" ? (
          <Card className="p-0 md:p-0">
            {upcoming.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("emptyUpcoming")}</p> : null}
            <ul className="divide-y divide-sage-100" data-testid="upcoming-clips">
              {upcoming.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/clips/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-inherit no-underline hover:bg-paper md:px-5">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{c.title}</span>
                      <span className="text-xs text-subtle-foreground">
                        {c.scheduled_at ? formatDateTime(c.scheduled_at, locale) : t("noDate")}
                        {c.account ? ` · ${c.account.handle}` : ""}
                      </span>
                    </span>
                    <StatusBadge type="clip" value={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : view === "calendar" ? (
          <MonthCalendar
            month={new Date()}
            locale={locale}
            events={upcoming
              .filter((c) => c.scheduled_at)
              .map((c) => ({ id: c.id, date: c.scheduled_at!, label: c.title, href: `/app/clips/${c.id}`, tone: EVENT_TONES[c.status] ?? TONES.neutral }))}
          />
        ) : published.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("emptyPublished")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5" data-testid="published-clips">
            {published.map((c) => (
              <ClipCard
                key={c.id}
                clip={c}
                href={`/app/clips/${c.id}`}
                meta={formatDate(c.published_at, locale)}
                views={views.has(c.id) ? formatCompact(views.get(c.id)!, locale) : undefined}
              />
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
