"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { prepareClipUploadAction } from "@/features/uploads/actions";
import { LargeFileUpload } from "@/features/uploads/large-file-upload";
import { VIDEO_MIME_TYPES } from "@/lib/storage/keys";

/** Dépôt du fichier fini d'un clip (9:16, MP4 de préférence). */
export function ClipFileUpload({ clipId }: { clipId: string }) {
  const t = useTranslations("admin.clips");
  const router = useRouter();
  return (
    <LargeFileUpload
      id="clip-file"
      accept={[...VIDEO_MIME_TYPES].join(",")}
      hint={t("fileHint")}
      prepare={(file) =>
        prepareClipUploadAction(clipId, { fileName: file.name, mimeType: file.type, size: file.size }).then((r) =>
          r.ok && r.data ? { ok: true as const, data: { key: r.data.key } } : { ok: false as const, error: r.ok ? "generic" : r.error },
        )
      }
      onDone={() => router.refresh()}
    />
  );
}
