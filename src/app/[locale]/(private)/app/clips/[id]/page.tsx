import { Download, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformBadge } from "@/components/ui/platform-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { CommentThread } from "@/features/agency/components/comment-thread";
import { getClip, latestViews } from "@/features/agency/queries";
import { ClipReview } from "@/features/client/components/clip-review";
import { requireUnlockedClient } from "@/features/client/guard";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { formatDateTime } from "@/lib/format";
import { formatCompact } from "@/lib/format-number";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clips");
  return { title: t("clientTitle") };
}

export default async function ClientClipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { user, writable } = await requireUnlockedClient();
  const clip = await getClip(id);
  if (!clip) notFound();
  const [t, locale, views] = await Promise.all([getTranslations("clips"), getLocale(), latestViews([clip.id])]);

  return (
    <>
      <PageHeader eyebrow={t("clientTitle")} title={clip.title} actions={<StatusBadge type="clip" value={clip.status} />} />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            {clip.storage_key ? (
              <video
                controls
                preload="metadata"
                className="aspect-[9/16] w-full max-w-[360px] rounded-xl bg-forest-950"
                src={`/api/clips/${clip.id}/file?inline`}
              />
            ) : (
              <div className="flex aspect-[9/16] w-full max-w-[360px] items-center justify-center rounded-xl bg-forest-800 p-6 text-center text-sm text-sage-300">
                {t("noFileYet")}
              </div>
            )}
            {clip.storage_key ? (
              <a href={`/api/clips/${clip.id}/file`} className={buttonVariants({ variant: "secondary" })}>
                <Download aria-hidden />
                {t("download")}
              </a>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            {clip.status === "a_valider" && writable ? <ClipReview clipId={clip.id} /> : null}
            <Card>
              <CardHeader>
                <CardTitle>{t("info")}</CardTitle>
              </CardHeader>
              <dl className="grid grid-cols-1 gap-x-5 gap-y-1 text-sm md:grid-cols-[minmax(140px,auto)_1fr] md:gap-y-2.5">
                <dt className="text-subtle-foreground">{t("fields.account")}</dt>
                <dd className="mb-2 flex items-center gap-2 font-medium md:mb-0">
                  {clip.account ? (
                    <>
                      <PlatformBadge platform={clip.account.platform} /> {clip.account.handle}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt className="text-subtle-foreground">{t("fields.publication")}</dt>
                <dd className="mb-2 font-medium md:mb-0">{formatDateTime(clip.published_at ?? clip.scheduled_at, locale)}</dd>
                {clip.hook ? (
                  <>
                    <dt className="text-subtle-foreground">{t("fields.hook")}</dt>
                    <dd className="mb-2 font-medium md:mb-0">{clip.hook}</dd>
                  </>
                ) : null}
                {clip.caption ? (
                  <>
                    <dt className="text-subtle-foreground">{t("fields.caption")}</dt>
                    <dd className="mb-2 whitespace-pre-line md:mb-0">{clip.caption}</dd>
                  </>
                ) : null}
                {clip.hashtags.length ? (
                  <>
                    <dt className="text-subtle-foreground">{t("fields.hashtags")}</dt>
                    <dd className="mb-2 md:mb-0">{clip.hashtags.map((h) => `#${h}`).join(" ")}</dd>
                  </>
                ) : null}
                {clip.video ? (
                  <>
                    <dt className="text-subtle-foreground">{t("fields.source")}</dt>
                    <dd className="mb-2 md:mb-0">{clip.video.title}</dd>
                  </>
                ) : null}
                {views.has(clip.id) ? (
                  <>
                    <dt className="text-subtle-foreground">{t("fields.views")}</dt>
                    <dd className="mb-2 font-display text-xl font-bold md:mb-0">{formatCompact(views.get(clip.id)!, locale)}</dd>
                  </>
                ) : null}
              </dl>
              {clip.published_url ? (
                <a href={clip.published_url} target="_blank" rel="noreferrer noopener" className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4" })}>
                  <ExternalLink aria-hidden />
                  {t("openPublication")}
                </a>
              ) : null}
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("comments")}</CardTitle>
              </CardHeader>
              <CommentThread entityType="clip" entityId={clip.id} viewerId={user.id} disabled={!writable} />
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
