"use client";

import AwsS3 from "@uppy/aws-s3";
import Uppy from "@uppy/core";
import GoldenRetriever from "@uppy/golden-retriever";
import { Film } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { cn } from "@/lib/utils";
import { completeUploadAction } from "./actions";

type Prepared = { key: string };

/**
 * Envoi d'un gros fichier directement vers le stockage vidéo (R2/S3), en
 * plusieurs parties au-delà de 100 Mo. Chaque requête est signée par le
 * serveur (/api/uploads/sign) pour la seule clé préparée. Les parties déjà
 * envoyées sont conservées : l'envoi reprend après une coupure ou un
 * rechargement de la page (Golden Retriever).
 */
export function LargeFileUpload({
  id,
  accept,
  disabled,
  prepare,
  onDone,
  hint,
}: {
  id: string;
  accept: string;
  disabled?: boolean;
  /** Prépare l'envoi côté serveur (contrôles, fiche, clé autorisée). */
  prepare: (file: File) => Promise<{ ok: true; data: Prepared } | { ok: false; error: string }>;
  onDone: () => void;
  hint: string;
}) {
  const t = useTranslations("uploads");
  const errorText = useErrorText();
  const uppyRef = useRef<Uppy | null>(null);
  const [progress, setProgress] = useState<{ name: string; percent: number; sent: number; total: number } | null>(null);
  const [error, setError] = useState<string>();
  const [over, setOver] = useState(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const uppy = new Uppy({ id, autoProceed: false, restrictions: { maxNumberOfFiles: 1 } })
      .use(AwsS3, {
        generateObjectKey: (file) => String(file.meta.objectKey),
        signRequest: async (request) => {
          const res = await fetch("/api/uploads/sign", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(request),
          });
          if (!res.ok) throw new Error(`signature refusée (${res.status})`);
          return res.json();
        },
      })
      .use(GoldenRetriever, { serviceWorker: false });

    uppy.on("upload-progress", (file, p) => {
      if (!file || !p.bytesTotal) return;
      setProgress({ name: file.name ?? "", percent: Math.round((p.bytesUploaded / p.bytesTotal) * 100), sent: p.bytesUploaded, total: p.bytesTotal });
    });
    uppy.on("upload-success", async (file) => {
      if (!file) return;
      const res = await completeUploadAction(String(file.meta.objectKey));
      uppy.removeFile(file.id);
      setProgress(null);
      if (res.ok) onDoneRef.current();
      else setError(res.error);
    });
    uppy.on("upload-error", (_file, err) => {
      console.error("[envoi]", err);
      setError("uploadFailed");
    });
    // Envoi restauré après un rechargement : on le relance.
    uppy.on("restored", () => {
      if (uppy.getFiles().length) void uppy.upload();
    });
    uppyRef.current = uppy;
    return () => {
      uppy.destroy();
      uppyRef.current = null;
    };
  }, [id]);

  const start = async (file: File) => {
    const uppy = uppyRef.current;
    if (!uppy || progress) return;
    setError(undefined);
    const prepared = await prepare(file);
    if (!prepared.ok) return setError(prepared.error);
    try {
      uppy.addFile({ name: file.name, type: file.type, data: file, meta: { objectKey: prepared.data.key } });
      setProgress({ name: file.name, percent: 0, sent: 0, total: file.size });
      await uppy.upload();
    } catch (err) {
      console.error("[envoi]", err);
      setError("uploadFailed");
      setProgress(null);
    }
  };

  const gb = (n: number) => (n / 1024 ** 3).toFixed(n > 1024 ** 3 ? 1 : 2);

  return (
    <div className="flex flex-col gap-3">
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      {progress ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3" aria-live="polite">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary text-sage-300">
            <Film className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 grow flex-col gap-1.5">
            <p className="truncate text-sm font-semibold">{progress.name}</p>
            <div className="h-2 overflow-hidden rounded-full bg-sage-200" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full rounded-full bg-forest-700" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="text-xs text-subtle-foreground">
              {t("progress", { sent: gb(progress.sent), total: gb(progress.total), percent: progress.percent })} · {t("keepOpen")}
            </p>
          </div>
        </div>
      ) : (
        <label
          htmlFor={`${id}-input`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const file = e.dataTransfer.files[0];
            if (file && !disabled) void start(file);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center",
            over ? "border-forest-700 bg-muted" : "border-sage-500 bg-sage-50",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <Film className="size-8 text-forest-600" aria-hidden />
          <span className="font-semibold">{t("dropTitle")}</span>
          <span className="text-xs text-subtle-foreground">{hint}</span>
          <span className={cn("inline-flex min-h-11 items-center rounded-sm border border-border-strong bg-card px-4 text-sm font-semibold")}>
            {t("chooseFile")}
          </span>
        </label>
      )}
      <input
        id={`${id}-input`}
        type="file"
        accept={accept}
        className="sr-only"
        data-testid={`${id}-input`}
        disabled={disabled || !!progress}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void start(file);
          e.target.value = "";
        }}
      />
      {progress ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() => {
            uppyRef.current?.cancelAll();
            setProgress(null);
          }}
        >
          {t("cancel")}
        </Button>
      ) : null}
    </div>
  );
}
