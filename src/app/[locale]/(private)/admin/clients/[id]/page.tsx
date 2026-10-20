import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformBadge } from "@/components/ui/platform-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubscriptionPanel } from "@/features/admin/agency/components/subscription-panel";
import { TeamPanel } from "@/features/admin/agency/components/team-panel";
import { clientActivity, getClientFile, staffOptions } from "@/features/admin/agency/queries";
import { CommentThread } from "@/features/agency/components/comment-thread";
import { listAccounts, listClips, listRequests, listVideos, type ClipStatus } from "@/features/agency/queries";
import { getPayments } from "@/features/client/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { can, requirePermission } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.clients");
  return { title: t("title") };
}

const CLIP_ORDER: ClipStatus[] = ["planifie", "en_montage", "a_valider", "valide", "programme", "publie", "rejete"];

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requirePermission("clients.read", { clientId: id });
  const client = await getClientFile(id);
  if (!client) notFound();

  const [t, tc, locale, payments, videos, clips, accounts, requests, staff, canSub, canTeam, canNotes, canActivity] = await Promise.all([
    getTranslations("admin.clients"),
    getTranslations("status.clip"),
    getLocale(),
    getPayments(id),
    listVideos({ clientId: id, limit: 10 }),
    listClips({ clientId: id }),
    listAccounts({ clientId: id }),
    listRequests({ clientId: id, open: true }),
    staffOptions(),
    can(user, "clients.manage_subscription"),
    can(user, "clients.update"),
    can(user, "clients.internal_notes"),
    can(user, "activity.read"),
  ]);
  const activity = canActivity ? await clientActivity(id) : [];
  const supabase = await createSupabaseServerClient();
  const { data: plans } = canSub ? await supabase.from("plans").select("id, name_fr, name_en").order("sort_order") : { data: [] };
  const counts = CLIP_ORDER.map((s) => ({ s, n: clips.filter((c) => c.status === s).length }));
  const tr = await getTranslations("roles");

  return (
    <>
      <PageHeader
        eyebrow={[client.profile?.email, client.niche, t("since", { date: formatDate(client.created_at, locale) })].filter(Boolean).join(" · ")}
        title={client.creator_name || client.profile?.full_name || "—"}
        actions={<StatusBadge type="client" value={client.status as never} />}
      />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile")}</CardTitle>
            </CardHeader>
            <dl className="grid grid-cols-1 gap-x-5 gap-y-1 text-sm md:grid-cols-[minmax(130px,auto)_1fr] md:gap-y-2.5">
              <dt className="text-subtle-foreground">{t("fields.name")}</dt>
              <dd className="mb-2 font-medium md:mb-0">{client.profile?.full_name}</dd>
              <dt className="text-subtle-foreground">{t("fields.language")}</dt>
              <dd className="mb-2 md:mb-0">{client.language ?? "—"}</dd>
              <dt className="text-subtle-foreground">{t("fields.goals")}</dt>
              <dd className="mb-2 whitespace-pre-line md:mb-0">{client.goals ?? "—"}</dd>
              <dt className="text-subtle-foreground">{t("fields.availability")}</dt>
              <dd className="mb-2 md:mb-0">{client.live_availability ?? "—"}</dd>
              <dt className="text-subtle-foreground">{t("fields.channels")}</dt>
              <dd className="mb-2 flex flex-col gap-1 md:mb-0">
                {Object.entries(client.channels ?? {}).map(([k, url]) => (
                  <a key={k} href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-forest-700">
                    {k} <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                ))}
              </dd>
            </dl>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("subscription.title")}</CardTitle>
            </CardHeader>
            <p className="mb-4 text-sm text-muted-foreground">
              {client.plan ? (locale === "en" ? client.plan.name_en : client.plan.name_fr) : "—"}
              {client.plan ? ` · ${formatMoney(client.custom_price_cents ?? client.plan.price_cents, client.plan.currency, locale)}` : ""}
              {client.period_end ? ` · ${formatDate(client.period_start, locale)} → ${formatDate(client.period_end, locale)}` : ""}
            </p>
            {canSub ? (
              <SubscriptionPanel
                clientId={id}
                status={client.status}
                plans={(plans ?? []).map((p) => ({ id: p.id, name: locale === "en" ? p.name_en : p.name_fr }))}
                currentPlanId={client.plan_id}
                customPrice={client.custom_price_cents != null ? (client.custom_price_cents / 100).toFixed(2) : ""}
                requiresValidation={client.requires_client_validation}
              />
            ) : null}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("team.title")}</CardTitle>
            </CardHeader>
            <TeamPanel
              clientId={id}
              editable={canTeam}
              members={client.assignments.map((a) => ({ user_id: a.user_id, team_role: a.team_role, name: a.user?.full_name ?? "—" }))}
              staff={staff.map((s) => ({ id: s.id, label: `${s.full_name} · ${tr(s.role as "editor")}` }))}
            />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("payments")}</CardTitle>
            </CardHeader>
            <ul className="flex flex-col gap-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono">{p.reference}</span>
                  <span className="tabular-nums">{formatMoney(p.amount_cents, p.currency, locale)}</span>
                  <StatusBadge type="payment" value={p.status} />
                </li>
              ))}
              {payments.length === 0 ? <li className="text-muted-foreground">—</li> : null}
            </ul>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("clips")}</CardTitle>
            <Link href={{ pathname: "/admin/clips", query: { client: id } }} className="text-sm font-semibold text-forest-700">
              {t("openKanban")}
            </Link>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {counts.map(({ s, n }) => (
              <span key={s} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                {tc(s)} · {n}
              </span>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("videos")}</CardTitle>
              <Link href={{ pathname: "/admin/videos", query: { client: id } }} className="text-sm font-semibold text-forest-700">
                {t("seeAll")}
              </Link>
            </CardHeader>
            <ul className="flex flex-col gap-2 text-sm">
              {videos.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{v.title || v.file_name || v.url}</span>
                  <StatusBadge type="video" value={v.status} />
                </li>
              ))}
              {videos.length === 0 ? <li className="text-muted-foreground">—</li> : null}
            </ul>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("accounts")}</CardTitle>
            </CardHeader>
            <ul className="flex flex-col gap-2 text-sm">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <PlatformBadge platform={a.platform} /> {a.handle}
                  </span>
                  <StatusBadge type="account" value={a.status} />
                </li>
              ))}
              {accounts.length === 0 ? <li className="text-muted-foreground">—</li> : null}
            </ul>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("openRequests")}</CardTitle>
          </CardHeader>
          <ul className="flex flex-col gap-2 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <Link href={{ pathname: "/admin/requests", query: { id: r.id } }} className="min-w-0 truncate">
                  {r.title}
                </Link>
                <StatusBadge type="request" value={r.status} />
              </li>
            ))}
            {requests.length === 0 ? <li className="text-muted-foreground">—</li> : null}
          </ul>
        </Card>

        {canNotes ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("internalNotes")}</CardTitle>
            </CardHeader>
            <p className="-mt-2 mb-4 text-xs text-t-amber-fg">{t("internalNotesHint")}</p>
            <CommentThread entityType="client" entityId={id} viewerId={user.id} />
          </Card>
        ) : null}

        {canActivity ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("activity")}</CardTitle>
            </CardHeader>
            <ul className="flex flex-col divide-y divide-sage-100 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2">
                  <span>
                    <span className="font-semibold">{a.actor?.full_name ?? "—"}</span> · {a.action}
                  </span>
                  <span className="whitespace-nowrap text-xs text-subtle-foreground">{formatDateTime(a.created_at, locale)}</span>
                </li>
              ))}
              {activity.length === 0 ? <li className="py-2 text-muted-foreground">—</li> : null}
            </ul>
          </Card>
        ) : null}
      </PageBody>
    </>
  );
}
