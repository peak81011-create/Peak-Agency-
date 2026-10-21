"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { replyTicketAction } from "../actions";

type SavedReply = { id: string; title: string; body_fr: string; body_en: string };

/** Réponse dans un ticket ; l'équipe peut écrire une note interne ou partir d'une réponse enregistrée. */
export function TicketReplyForm({ ticketId, staff = false, savedReplies = [], authorLocale }: { ticketId: string; staff?: boolean; savedReplies?: SavedReply[]; authorLocale?: string }) {
  const t = useTranslations("support");
  const locale = useLocale();
  const errorText = useErrorText();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const lang = authorLocale ?? locale;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const sent = body;
        setBody("");
        startTransition(async () => {
          setError(undefined);
          const res = await replyTicketAction(ticketId, sent, internal);
          if (res.ok) setInternal(false);
          else {
            setBody(sent);
            setError(res.error);
          }
        });
      }}
    >
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      {staff && savedReplies.length ? (
        <Field label={t("savedReply")} htmlFor={`saved-${ticketId}`}>
          <Select
            id={`saved-${ticketId}`}
            defaultValue=""
            onChange={(e) => {
              const r = savedReplies.find((x) => x.id === e.target.value);
              if (r) setBody((lang === "en" ? r.body_en : r.body_fr) || r.body_fr);
              e.target.value = "";
            }}
          >
            <option value="">{t("savedReplyChoose")}</option>
            {savedReplies.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label={t("yourMessage")} htmlFor={`reply-${ticketId}`}>
        <Textarea id={`reply-${ticketId}`} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {staff ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-[18px] accent-primary" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
            {t("internalNote")}
          </label>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending || !body.trim()}>
          {t("send")}
        </Button>
      </div>
    </form>
  );
}
