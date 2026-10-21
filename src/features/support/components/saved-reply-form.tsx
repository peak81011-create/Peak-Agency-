"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import type { SavedReplyInput } from "@/lib/validation/support";
import { deleteSavedReplyAction, saveSavedReplyAction } from "../actions";

export function SavedReplyForm({ id, defaults }: { id: string | null; defaults: SavedReplyInput }) {
  const t = useTranslations("admin.support.replies");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const [values, setValues] = useState(defaults);
  const [status, setStatus] = useState<"saved" | string>();
  const [pending, startTransition] = useTransition();
  const fid = (n: string) => `reply-${id ?? "new"}-${n}`;
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveSavedReplyAction(id, values);
          setStatus(res.ok ? "saved" : res.error);
          if (res.ok && !id) setValues(defaults);
        });
      }}
    >
      {status === "saved" ? <Callout tone="ok">{tc("saved")}</Callout> : null}
      {status && status !== "saved" ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <Field label={t("name")} htmlFor={fid("title")}>
        <Input id={fid("title")} value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={t("bodyFr")} htmlFor={fid("fr")}>
          <Textarea id={fid("fr")} rows={4} value={values.bodyFr} onChange={(e) => setValues({ ...values, bodyFr: e.target.value })} />
        </Field>
        <Field label={t("bodyEn")} htmlFor={fid("en")}>
          <Textarea id={fid("en")} rows={4} value={values.bodyEn} onChange={(e) => setValues({ ...values, bodyEn: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        {id ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => startTransition(async () => void (await deleteSavedReplyAction(id)))}>
            {t("delete")}
          </Button>
        ) : null}
        <Button type="submit" variant="secondary" disabled={pending}>
          {id ? tc("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
