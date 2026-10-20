import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { RequestManage } from "@/features/admin/agency/components/request-manage";
import { staffOptions } from "@/features/admin/agency/queries";
import { CommentThread } from "@/features/agency/components/comment-thread";
import { getRequest, listRequests } from "@/features/agency/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { can, requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.requests");
  return { title: t("title") };
}

const TABS = ["open", "mine", "closed"] as const;

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ tab?: string; id?: string }> }) {
  const user = await requirePermission("requests.read");
  const params = await searchParams;
  const tab = TABS.find((x) => x === params.tab) ?? "open";
  const [t, tt, locale, requests, staff] = await Promise.all([
    getTranslations("admin.requests"),
    getTranslations("requests.types"),
    getLocale(),
    listRequests(tab === "open" ? { open: true } : tab === "closed" ? { open: false } : { assignedTo: user.id }),
    staffOptions(),
  ]);
  const selected = params.id && /^[0-9a-f-]{36}$/.test(params.id) ? await getRequest(params.id) : (requests[0] ?? null);
  const canManage = selected ? await can(user, "requests.manage", { clientId: selected.client_id }) : false;
  const canConvert = selected ? await can(user, "clips.create", { clientId: selected.client_id }) : false;

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label={t("title")}>
          {TABS.map((key) => (
            <Link
              key={key}
              href={{ pathname: "/admin/requests", query: { tab: key } }}
              aria-current={key === tab ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium no-underline",
                key === tab ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground",
              )}
            >
              {t(`tabs.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-6">
          <Card className="p-0 md:p-0">
            {requests.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p> : null}
            <ul className="divide-y divide-sage-100" data-testid="admin-request-list">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={{ pathname: "/admin/requests", query: { tab, id: r.id } }}
                    className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-inherit no-underline hover:bg-paper", r.id === selected?.id && "bg-sage-50")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.title}</span>
                      <span className="text-xs text-subtle-foreground">
                        {r.client?.creator_name} · {tt(r.type)} · {formatDateTime(r.updated_at, locale)}
                      </span>
                    </span>
                    <StatusBadge type="request" value={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          {selected ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    #R-{selected.number} · {selected.title}
                  </CardTitle>
                  <StatusBadge type="request" value={selected.status} />
                </CardHeader>
                <p className="mb-2 text-xs text-subtle-foreground">
                  <Link href={`/admin/clients/${selected.client_id}`}>{selected.client?.creator_name}</Link> · {tt(selected.type)}
                  {selected.desired_due_date ? ` · ${t("dueDate", { date: selected.desired_due_date })}` : ""}
                </p>
                <p className="mb-4 whitespace-pre-line text-sm">{selected.description}</p>
                {canManage ? (
                  <RequestManage
                    key={selected.id}
                    requestId={selected.id}
                    canConvert={canConvert && !selected.converted_clip_id}
                    initial={{ status: selected.status, priority: selected.priority, assignedTo: selected.assigned_to ?? "" }}
                    staff={staff.map((s) => ({ id: s.id, label: s.full_name }))}
                  />
                ) : null}
                {selected.converted_clip_id ? (
                  <Link href={`/admin/clips/${selected.converted_clip_id}`} className="mt-3 inline-block text-sm font-semibold text-forest-700">
                    {t("seeClip")}
                  </Link>
                ) : null}
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("conversation")}</CardTitle>
                </CardHeader>
                <CommentThread entityType="request" entityId={selected.id} viewerId={user.id} allowInternal />
              </Card>
            </div>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
