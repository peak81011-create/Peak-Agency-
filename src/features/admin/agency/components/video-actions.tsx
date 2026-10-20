"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { createClipsFromVideoAction, setVideoStatusAction } from "../actions";

const STATUSES = ["recue", "en_traitement", "clips_extraits", "archivee", "erreur"] as const;

/** Statut d'une vidéo source et création des clips en lot (un titre par ligne). */
export function VideoActions({
  videoId,
  status,
  editors,
  canCreate,
}: {
  videoId: string;
  status: (typeof STATUSES)[number] | "envoi";
  editors: { id: string; label: string }[];
  canCreate: boolean;
}) {
  const t = useTranslations("admin.videos");
  const ts = useTranslations("status.video");
  const errorText = useErrorText();
  const [titles, setTitles] = useState("");
  const [editor, setEditor] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      {message ? <Callout tone="ok">{message}</Callout> : null}
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      {status !== "envoi" ? (
        <Field label={t("status")} htmlFor={`video-status-${videoId}`}>
          <Select
            id={`video-status-${videoId}`}
            defaultValue={status}
            disabled={pending}
            onChange={(e) =>
              startTransition(async () => {
                const res = await setVideoStatusAction(videoId, e.target.value as (typeof STATUSES)[number]);
                setError(res.ok ? undefined : res.error);
              })
            }
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {canCreate ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await createClipsFromVideoAction(videoId, titles, editor);
              if (res.ok) {
                setTitles("");
                setMessage(t("created", { count: res.data?.count ?? 0 }));
                setError(undefined);
              } else setError(res.error);
            });
          }}
        >
          <Field label={t("batchTitles")} htmlFor={`batch-${videoId}`} hint={t("batchHint")}>
            <Textarea id={`batch-${videoId}`} rows={4} value={titles} onChange={(e) => setTitles(e.target.value)} />
          </Field>
          <Field label={t("editor")} htmlFor={`batch-editor-${videoId}`}>
            <Select id={`batch-editor-${videoId}`} value={editor} onChange={(e) => setEditor(e.target.value)}>
              <option value="">—</option>
              {editors.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.label}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="secondary" className="self-end" disabled={pending || !titles.trim()}>
            {t("createClips")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
