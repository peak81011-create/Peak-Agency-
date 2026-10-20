"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { reviewClipAction } from "@/features/agency/actions";
import { useErrorText } from "@/features/auth/components/use-translated-error";

/** Valider le clip ou demander une modification (avec horodatage conseillé). */
export function ClipReview({ clipId }: { clipId: string }) {
  const t = useTranslations("clips.review");
  const errorText = useErrorText();
  const [changes, setChanges] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const send = (approve: boolean) =>
    startTransition(async () => {
      setError(undefined);
      const res = await reviewClipAction(clipId, approve, feedback);
      if (!res.ok) setError(res.error);
    });

  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-t-amber-fg/40 bg-t-amber-bg/40 p-4">
      <p className="font-semibold">{t("title")}</p>
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      {changes ? (
        <>
          <Field label={t("what")} htmlFor="clip-feedback" hint={t("tip")}>
            <Textarea id="clip-feedback" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setChanges(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button onClick={() => send(false)} disabled={pending || !feedback.trim()}>
              {t("sendChanges")}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => send(true)} disabled={pending}>
            {t("approve")}
          </Button>
          <Button variant="secondary" onClick={() => setChanges(true)} disabled={pending}>
            {t("requestChanges")}
          </Button>
        </div>
      )}
    </div>
  );
}
