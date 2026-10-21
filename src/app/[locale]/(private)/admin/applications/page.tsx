import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { ApplicationStatusSelect } from "@/features/admin/applications/application-status-select";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/lib/validation/join";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.applications");
  return { title: t("title") };
}

type Application = {
  id: string;
  nickname: string;
  first_name: string;
  email: string;
  country: string;
  languages: string;
  portfolio_links: string[];
  software: string;
  experience: "debutant" | "intermediaire" | "avance";
  hours_per_week: "moins_10" | "10_20" | "20_35" | "plus_35";
  motivation: string | null;
  status: (typeof APPLICATION_STATUSES)[number];
  created_at: string;
};

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission("users.manage");
  const params = await searchParams;
  const filter = APPLICATION_STATUSES.find((s) => s === params.status);
  const [t, tj, ts, locale] = await Promise.all([
    getTranslations("admin.applications"),
    getTranslations("apply.form"),
    getTranslations("status.application"),
    getLocale(),
  ]);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("clipper_applications")
    .select("id, nickname, first_name, email, country, languages, portfolio_links, software, experience, hours_per_week, motivation, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter) query = query.eq("status", filter);
  const { data } = await query;
  const applications = (data ?? []) as Application[];

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("lead")}</p>
        <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label={t("title")}>
          {[undefined, ...APPLICATION_STATUSES].map((s) => (
            <Link
              key={s ?? "all"}
              href={{ pathname: "/admin/applications", query: s ? { status: s } : {} }}
              aria-current={s === filter ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium no-underline",
                s === filter ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground",
              )}
            >
              {s ? ts(s) : t("all")}
            </Link>
          ))}
        </nav>
        {applications.length === 0 ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {applications.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {a.first_name} · {a.nickname}
                  </p>
                  <a href={`mailto:${a.email}`} className="text-sm text-forest-700">
                    {a.email}
                  </a>
                  <p className="text-xs text-subtle-foreground">{t("receivedOn", { date: formatDate(a.created_at, locale) })}</p>
                </div>
                <ApplicationStatusSelect id={a.id} status={a.status} label={t("statusFor", { name: a.first_name })} />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-subtle-foreground">{tj("experience")}</dt>
                <dd>{tj(`experiences.${a.experience}`)}</dd>
                <dt className="text-subtle-foreground">{tj("hours")}</dt>
                <dd>{tj(`hoursOptions.${a.hours_per_week}`)}</dd>
                <dt className="text-subtle-foreground">{tj("software")}</dt>
                <dd>{a.software}</dd>
                <dt className="text-subtle-foreground">{tj("country")}</dt>
                <dd>{a.country}</dd>
                <dt className="text-subtle-foreground">{tj("languages")}</dt>
                <dd>{a.languages}</dd>
                <dt className="text-subtle-foreground">{tj("portfolio")}</dt>
                <dd className="flex min-w-0 flex-col">
                  {a.portfolio_links.map((l) => (
                    <a key={l} href={l} target="_blank" rel="noreferrer noopener" className="truncate text-forest-700">
                      {l}
                    </a>
                  ))}
                </dd>
              </dl>
              {a.motivation ? <p className="whitespace-pre-line rounded-md bg-paper p-3 text-sm">{a.motivation}</p> : null}
            </Card>
          ))}
        </div>
      </PageBody>
    </>
  );
}
