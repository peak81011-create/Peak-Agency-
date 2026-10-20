"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { createLinkVideoAction, prepareVideoUploadAction } from "@/features/uploads/actions";
import { LargeFileUpload } from "@/features/uploads/large-file-upload";
import { VIDEO_MIME_TYPES } from "@/lib/storage/keys";
import { cn } from "@/lib/utils";
import { knownLinkHost, PRIORITIES } from "@/lib/validation/video";

/** Envoi d'une vidéo source : fichier lourd (direct vers le stockage) ou lien. */
export function VideoSubmit({ clientId, storageReady, maxSizeLabel }: { clientId: string; storageReady: boolean; maxSizeLabel: string }) {
  const t = useTranslations("videos.submit");
  const errorText = useErrorText();
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "link">(storageReady ? "file" : "link");
  const [meta, setMeta] = useState({ title: "", notes: "", priority: "normale" as (typeof PRIORITIES)[number], recordedAt: "" });
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"sent" | string>();
  const [pending, startTransition] = useTransition();
  const host = url ? knownLinkHost(url) : null;

  const done = () => {
    setStatus("sent");
    setMeta({ title: "", notes: "", priority: "normale", recordedAt: "" });
    setUrl("");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={t("mode")} className="inline-flex gap-0.5 self-start rounded-sm border border-border bg-muted p-[3px]">
        {(["file", "link"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            disabled={m === "file" && !storageReady}
            onClick={() => setMode(m)}
            className={cn(
              "min-h-[34px] rounded-xs px-3 text-[13px] font-semibold disabled:opacity-40",
              mode === m ? "bg-card text-primary shadow-1" : "text-muted-foreground",
            )}
          >
            {t(`modes.${m}`)}
          </button>
        ))}
      </div>
      {!storageReady ? <Callout tone="info">{t("storageMissing")}</Callout> : null}
      {status === "sent" ? <Callout tone="ok">{t("sent")}</Callout> : null}
      {status && status !== "sent" ? <Callout tone="error">{errorText(status)}</Callout> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("title")} htmlFor="video-title" optional={t("optional")}>
          <Input id="video-title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
        </Field>
        <Field label={t("recordedAt")} htmlFor="video-date" optional={t("optional")}>
          <Input id="video-date" type="date" value={meta.recordedAt} onChange={(e) => setMeta({ ...meta, recordedAt: e.target.value })} />
        </Field>
      </div>
      <Field label={t("notes")} htmlFor="video-notes" hint={t("notesHint")}>
        <Textarea id="video-notes" rows={3} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-semibold">{t("priority")}</legend>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <label key={p} className={cn("inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3 text-[13px] font-medium", meta.priority === p ? "border-primary bg-primary text-white" : "border-border-strong bg-card text-muted-foreground")}>
              <input type="radio" name="priority" value={p} className="sr-only" checked={meta.priority === p} onChange={() => setMeta({ ...meta, priority: p })} />
              {t(`priorities.${p}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "file" ? (
        <LargeFileUpload
          id="video-upload"
          accept={[...VIDEO_MIME_TYPES, ".mkv", ".mov"].join(",")}
          hint={t("fileHint", { max: maxSizeLabel })}
          prepare={(file) =>
            prepareVideoUploadAction(clientId, { ...meta, fileName: file.name, mimeType: file.type, size: file.size }).then((r) =>
              r.ok && r.data ? { ok: true as const, data: { key: r.data.key } } : { ok: false as const, error: r.ok ? "generic" : r.error },
            )
          }
          onDone={done}
        />
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              setStatus(undefined);
              const res = await createLinkVideoAction(clientId, { ...meta, url });
              if (res.ok) done();
              else setStatus(res.fieldErrors?.url ?? res.error);
            });
          }}
        >
          <Field label={t("url")} htmlFor="video-url" hint={host ? t("hostDetected", { host }) : t("urlHint")}>
            <Input id="video-url" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="self-end" disabled={pending || !url}>
            {t("submit")}
          </Button>
        </form>
      )}
    </div>
  );
}
