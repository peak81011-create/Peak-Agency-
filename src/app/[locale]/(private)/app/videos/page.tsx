import { Download, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { listVideos } from "@/features/agency/queries";
import { VideoSubmit } from "@/features/client/components/video-submit";
import { requireUnlockedClient } from "@/features/client/guard";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { formatDate } from "@/lib/format";
import { getSettingsValue } from "@/lib/settings";
import { isVideoStorageConfigured } from "@/lib/storage/s3";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("videos");
  return { title: t("clientTitle") };
}

export default async function ClientVideosPage() {
  const { client, writable } = await requireUnlockedClient();
  const [t, locale, videos, uploads] = await Promise.all([
    getTranslations("videos"),
    getLocale(),
    listVideos({ clientId: client.id }),
    getSettingsValue("uploads", { max_video_bytes: 10 * 1024 ** 3 }),
  ]);
  const maxGb = `${Math.round(Number(uploads.max_video_bytes) / 1024 ** 3)} Go`;

  return (
    <>
      <PageHeader title={t("clientTitle")} />
      <PageBody>
        <p className="text-muted-foreground">{t("clientLead")}</p>
        <Card>
          <CardHeader>
            <CardTitle>{t("newVideo")}</CardTitle>
          </CardHeader>
          {writable ? (
            <VideoSubmit clientId={client.id} storageReady={isVideoStorageConfigured()} maxSizeLabel={maxGb} />
          ) : (
            <Callout tone="warn">{t("readOnly")}</Callout>
          )}
        </Card>
        <Card className="p-0 md:p-0">
          <h2 className="px-4 pt-4 text-base font-semibold md:px-5 md:pt-5">{t("myVideos")}</h2>
          {videos.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-sage-100" data-testid="video-list">
              {videos.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{v.title || v.file_name || v.url}</p>
                    <p className="text-xs text-subtle-foreground">
                      {formatDate(v.created_at, locale)} · {t(`priorities.${v.priority}`)} · {t("clipsCount", { count: v.clips?.[0]?.count ?? 0 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge type="video" value={v.status} />
                    {v.kind === "lien" && v.url ? (
                      <a href={v.url} target="_blank" rel="noreferrer noopener" className="text-forest-700" aria-label={t("openLink")}>
                        <ExternalLink className="size-4" aria-hidden />
                      </a>
                    ) : v.status !== "envoi" ? (
                      <a href={`/api/videos/${v.id}/download`} className="text-forest-700" aria-label={t("download")}>
                        <Download className="size-4" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageBody>
    </>
  );
}
