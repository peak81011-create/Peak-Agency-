import { Download } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipFileUpload } from "@/features/admin/agency/components/clip-file-upload";
import { ClipForm } from "@/features/admin/agency/components/clip-form";
import { ClipStatusSelect } from "@/features/admin/agency/components/clip-status-select";
import { clipFormOptions } from "@/features/admin/agency/form-options";
import { CommentThread } from "@/features/agency/components/comment-thread";
import { getClip } from "@/features/agency/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { requirePermission } from "@/lib/auth/session";
import { formatTimecode, type ClipFormInput } from "@/lib/validation/admin-agency";
import { isVideoStorageConfigured } from "@/lib/storage/s3";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.clips");
  return { title: t("title") };
}

const local = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

// /admin/clips/new crée un clip ; /admin/clips/<id> le modifie.
export default async function AdminClipPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ client?: string; video?: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const user = await requirePermission(isNew ? "clips.create" : "clips.read");
  const clip = isNew ? null : await getClip(id);
  if (!isNew && !clip) notFound();
  const [t, options, query] = await Promise.all([getTranslations("admin.clips"), clipFormOptions(), searchParams]);

  const defaults: ClipFormInput = {
    clientId: clip?.client_id ?? query.client ?? "",
    title: clip?.title ?? "",
    hook: clip?.hook ?? "",
    caption: clip?.caption ?? "",
    hashtags: (clip?.hashtags ?? []).map((h) => `#${h}`).join(" "),
    start: formatTimecode(clip?.start_seconds),
    end: formatTimecode(clip?.end_seconds),
    sourceVideoId: clip?.source_video_id ?? query.video ?? "",
    socialAccountId: clip?.social_account_id ?? "",
    clipperId: clip?.clipper_id ?? (isNew ? user.id : ""),
    dueAt: local(clip?.due_at ?? null),
    scheduledAt: local(clip?.scheduled_at ?? null),
    publishedUrl: clip?.published_url ?? "",
  };

  return (
    <>
      <PageHeader
        eyebrow={clip?.client?.creator_name}
        title={clip ? clip.title : t("new")}
        actions={clip ? <div className="w-48"><ClipStatusSelect clipId={clip.id} status={clip.status} label={t("status")} /></div> : null}
      />
      <PageBody>
        {clip?.client_feedback ? (
          <Callout tone="warn">
            <span className="font-semibold">{t("clientFeedback")}</span> {clip.client_feedback}
          </Callout>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card>
            <ClipForm clipId={clip?.id ?? null} defaults={defaults} {...options} />
          </Card>
          {clip ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("file")}</CardTitle>
                </CardHeader>
                {clip.storage_key ? (
                  <div className="mb-4 flex flex-col gap-2">
                    <video controls preload="metadata" className="aspect-[9/16] w-full max-w-[280px] rounded-lg bg-forest-950" src={`/api/clips/${clip.id}/file?inline`} />
                    <a href={`/api/clips/${clip.id}/file`} className={buttonVariants({ variant: "secondary", size: "sm", className: "self-start" })}>
                      <Download aria-hidden />
                      {clip.file_name}
                    </a>
                  </div>
                ) : null}
                {isVideoStorageConfigured() ? <ClipFileUpload clipId={clip.id} /> : <Callout tone="info">{t("storageMissing")}</Callout>}
              </Card>
              {clip.source_video_id ? (
                <a href={`/api/videos/${clip.source_video_id}/download`} className={buttonVariants({ variant: "secondary" })}>
                  <Download aria-hidden />
                  {t("downloadSource")}
                </a>
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle>{t("comments")}</CardTitle>
                </CardHeader>
                <CommentThread entityType="clip" entityId={clip.id} viewerId={user.id} allowInternal />
              </Card>
            </div>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
