"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import type { SettingsFormKey } from "@/lib/validation/settings";
import { saveSettingsAction } from "./actions";

export type SettingsField = { name: string; multiline?: boolean; inputMode?: "numeric" | "email" };

/** Formulaire générique d'un groupe de paramètres (validé côté serveur). */
export function SettingsForm({
  settingsKey,
  fields,
  defaults,
}: {
  settingsKey: SettingsFormKey;
  fields: SettingsField[];
  defaults: Record<string, string>;
}) {
  const t = useTranslations(`admin.settings.${settingsKey}`);
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const [values, setValues] = useState(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"saved" | string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setStatus(undefined);
          const res = await saveSettingsAction(settingsKey, values);
          setErrors(res.ok ? {} : (res.fieldErrors ?? {}));
          setStatus(res.ok ? "saved" : res.fieldErrors ? undefined : res.error);
        });
      }}
    >
      {status === "saved" ? <Callout tone="ok">{tc("saved")}</Callout> : null}
      {status && status !== "saved" ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => {
          const id = `${settingsKey}-${f.name}`;
          const props = {
            id,
            value: values[f.name] ?? "",
            "aria-invalid": !!errors[f.name],
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setValues((v) => ({ ...v, [f.name]: e.target.value })),
          };
          return (
            <Field
              key={f.name}
              label={t(`fields.${f.name}` as never)}
              htmlFor={id}
              hint={t.has(`hints.${f.name}` as never) ? t(`hints.${f.name}` as never) : undefined}
              error={errorText(errors[f.name])}
              className={f.multiline ? "md:col-span-2" : undefined}
            >
              {f.multiline ? <Textarea rows={2} {...props} /> : <Input inputMode={f.inputMode} {...props} />}
            </Field>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
