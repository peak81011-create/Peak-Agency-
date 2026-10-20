"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import type { EntityType } from "@/lib/validation/agency";
import { addCommentAction } from "../actions";

export function CommentForm({
  entityType,
  entityId,
  allowInternal = false,
  disabled = false,
}: {
  entityType: EntityType;
  entityId: string;
  allowInternal?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("comments");
  const errorText = useErrorText();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(entityType === "client");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        // Le champ est vidé tout de suite : un nouveau message peut être saisi
        // pendant l'envoi sans être effacé ; il est restauré en cas d'erreur.
        const sent = body;
        setBody("");
        startTransition(async () => {
          setError(undefined);
          const res = await addCommentAction(entityType, entityId, sent, internal);
          if (res.ok) setInternal(entityType === "client");
          else {
            setBody(sent);
            setError(res.error);
          }
        });
      }}
    >
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      <label htmlFor={`comment-${entityId}`} className="text-[13px] font-semibold">
        {entityType === "client" ? t("newNote") : t("yourComment")}
      </label>
      <div className="flex items-end gap-2 rounded-lg border border-border-strong bg-card p-3">
        <Textarea
          id={`comment-${entityId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          disabled={disabled}
          className="min-h-11 border-0 p-1 focus:ring-0"
        />
        <Button type="submit" size="icon" aria-label={t("send")} disabled={pending || disabled || !body.trim()}>
          <Send aria-hidden />
        </Button>
      </div>
      {allowInternal && entityType !== "client" ? (
        <label className="flex min-h-8 items-center gap-2 text-sm">
          <input type="checkbox" className="size-[18px] accent-primary" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
          {t("internal")}
        </label>
      ) : null}
    </form>
  );
}
