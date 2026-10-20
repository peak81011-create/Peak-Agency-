import { Download, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { VideoActions } from "@/features/admin/agency/components/video-actions";
import { staffOptions } from "@/features/admin/agency/queries";
import { CommentThread } from "@/features/agency/components/comment-thread";
import { listVideos } from "@/features/agency/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { can, requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.videos");
  return { title: t("title") };
}

const uuid = /^[0-9a-f-]{36}$/;

export default async function AdminVideosPage({ searchParams }: { searchParams: Promise<{ client?: string; id?: string }> }) {
  const user = await requirePermission("videos.read");
  const params = await searchParams;
  const clientId = params.client && uuid.test(params.client) ? params.client : undefined;
  const [t, tv, locale, videos, staff, canCreate] = await Promise.all([
    getTranslations("admin.videos"),
    getTranslations("videos"),
    getLocale(),
    listVideos({ clientId, limit: 300 }),
    staffOptions(),
    can(user, "clips.create"),
  ]);
  const selected = videos.find((v) => v.id === params.id) ?? videos[0];

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-6">
          <Card className="p-0 md:p-0">
            {videos.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p> : null}
            <ul className="divide-y divide-sage-100" data-testid="admin-video-list">
              {videos.map((v) => (
                <li key={v.id}>
                  <Link
                    href={{ pathname: "/admin/videos", query: { ...(clientId ? { client: clientId } : {}), id: v.id } }}
                    className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-inherit no-underline hover:bg-paper", v.id === selected?.id && "bg-sage-50")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{v.title || v.file_name || v.url}</span>
                      <span className="text-xs text-subtle-foreground">
                        {v.client?.creator_name} · {formatDateTime(v.created_at, locale)} · {tv(`priorities.${v.priority}`)}
                      </span>
                    </span>
                    <StatusBadge type="video" value={v.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          {selected ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{selected.title || selected.file_name || selected.url}</CardTitle>
                  <StatusBadge type="video" value={selected.status} />
                </CardHeader>
                {selected.notes ? <p className="mb-3 whitespace-pre-line rounded-md bg-muted p-3 text-sm">« {selected.notes} »</p> : null}
                <div className="mb-4 flex flex-wrap gap-3 text-sm">
                  {selected.kind === "lien" && selected.url ? (
                    <a href={selected.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-forest-700">
                      <ExternalLink className="size-4" aria-hidden />
                      {t("openLink")}
                    </a>
                  ) : selected.status !== "envoi" ? (
                    <a href={`/api/videos/${selected.id}/download`} className="inline-flex items-center gap-1 font-semibold text-forest-700">
                      <Download className="size-4" aria-hidden />
                      {t("download")}
                    </a>
                  ) : null}
                  <Link href={{ pathname: "/admin/clips/new", query: { client: selected.client_id, video: selected.id } }} className="font-semibold text-forest-700">
                    {t("newClip")}
                  </Link>
                </div>
                <VideoActions
                  videoId={selected.id}
                  status={selected.status}
                  canCreate={canCreate}
                  editors={staff.map((s) => ({ id: s.id, label: s.full_name }))}
                />
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("comments")}</CardTitle>
                </CardHeader>
                <CommentThread entityType="video" entityId={selected.id} viewerId={user.id} allowInternal />
              </Card>
            </div>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
