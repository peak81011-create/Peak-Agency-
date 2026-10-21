import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { ViewsChart } from "@/features/agency/components/views-chart";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import type { Locale } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { formatCompact } from "@/lib/format-number";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nowMs } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.traffic");
  return { title: t("title") };
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export default async function TrafficPage() {
  await requirePermission("reports.view_all");
  const [t, locale] = await Promise.all([getTranslations("admin.traffic"), getLocale() as Promise<Locale>]);
  const now = nowMs();
  const today = isoDay(now);
  const since30 = isoDay(now - 29 * 86_400_000);
  const since7 = isoDay(now - 6 * 86_400_000);
  const supabase = await createSupabaseServerClient();
  const [{ data: views }, { data: visitors }, { count: signups }, { count: applications }, { count: messages }] = await Promise.all([
    supabase.from("page_views").select("day, path, views").gte("day", since30),
    supabase.from("daily_visitors").select("day, referrer_host").gte("day", since30).limit(50000),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client").gte("created_at", since30),
    supabase.from("clipper_applications").select("id", { count: "exact", head: true }).gte("created_at", since30),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).gte("created_at", since30),
  ]);

  const visitorsByDay = new Map<string, number>();
  const referrers = new Map<string, number>();
  for (const v of visitors ?? []) {
    visitorsByDay.set(v.day, (visitorsByDay.get(v.day) ?? 0) + 1);
    if (v.referrer_host) referrers.set(v.referrer_host, (referrers.get(v.referrer_host) ?? 0) + 1);
  }
  const pages = new Map<string, number>();
  let views30 = 0;
  let views7 = 0;
  let viewsToday = 0;
  for (const v of views ?? []) {
    pages.set(v.path, (pages.get(v.path) ?? 0) + v.views);
    views30 += v.views;
    if (v.day >= since7) views7 += v.views;
    if (v.day === today) viewsToday += v.views;
  }
  const sum = (from: string) => [...visitorsByDay.entries()].filter(([d]) => d >= from).reduce((a, [, n]) => a + n, 0);
  const chart = Array.from({ length: 30 }, (_, i) => {
    const day = isoDay(now - (29 - i) * 86_400_000);
    return { day, views: visitorsByDay.get(day) ?? 0 };
  });
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("lead")}</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={t("visitorsToday")} value={formatCompact(visitorsByDay.get(today) ?? 0, locale)} detail={t("viewsDetail", { n: viewsToday })} />
          <Stat label={t("visitors7")} value={formatCompact(sum(since7), locale)} detail={t("viewsDetail", { n: views7 })} />
          <Stat label={t("visitors30")} value={formatCompact(sum(since30), locale)} detail={t("viewsDetail", { n: views30 })} />
          <Stat label={t("signups30")} value={String(signups ?? 0)} detail={t("applicationsDetail", { applications: applications ?? 0, messages: messages ?? 0 })} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("chartTitle")}</CardTitle>
          </CardHeader>
          <ViewsChart data={chart} locale={locale} label={t("visitors")} />
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("topPages")}</CardTitle>
            </CardHeader>
            {pages.size === 0 ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : null}
            <ul className="flex flex-col divide-y divide-border text-sm" data-testid="top-pages">
              {top(pages).map(([path, n]) => (
                <li key={path} className="flex justify-between gap-3 py-2">
                  <span className="truncate font-mono text-xs">{path}</span>
                  <span className="font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("topReferrers")}</CardTitle>
            </CardHeader>
            {referrers.size === 0 ? <p className="text-sm text-muted-foreground">{t("emptyReferrers")}</p> : null}
            <ul className="flex flex-col divide-y divide-border text-sm">
              {top(referrers).map(([host, n]) => (
                <li key={host} className="flex justify-between gap-3 py-2">
                  <span className="truncate">{host}</span>
                  <span className="font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
