"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { FAQ_AUDIENCES, type FaqItemInput } from "@/lib/validation/faq";
import { deleteFaqItemAction, saveFaqItemAction } from "./actions";

/** Édition d'une question de la FAQ (FR et EN). */
export function FaqItemForm({ id, defaults }: { id: string | null; defaults: FaqItemInput }) {
  const t = useTranslations("admin.faq");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const [values, setValues] = useState(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"saved" | string>();
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof FaqItemInput>(k: K, v: FaqItemInput[K]) => setValues({ ...values, [k]: v });
  const fid = (name: string) => `faq-${id ?? "new"}-${name}`;

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setStatus(undefined);
          const res = await saveFaqItemAction(id, values);
          setErrors(res.ok ? {} : (res.fieldErrors ?? {}));
          setStatus(res.ok ? "saved" : res.fieldErrors ? undefined : res.error);
          if (res.ok && !id) setValues(defaults);
        });
      }}
    >
      {status === "saved" ? <Callout tone="ok">{tc("saved")}</Callout> : null}
      {status && status !== "saved" ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Field label={t("audience")} htmlFor={fid("audience")}>
          <Select id={fid("audience")} value={values.audience} onChange={(e) => set("audience", e.target.value as FaqItemInput["audience"])}>
            {FAQ_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {t(`audiences.${a}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("order")} htmlFor={fid("order")} error={errorText(errors.sortOrder)}>
          <Input id={fid("order")} inputMode="numeric" value={values.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
        </Field>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-[18px] accent-primary" checked={values.isVisible} onChange={(e) => set("isVisible", e.target.checked)} />
            {t("visible")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-[18px] accent-primary" checked={values.isTop} onChange={(e) => set("isTop", e.target.checked)} />
            {t("top")}
          </label>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(["Fr", "En"] as const).map((lang) => (
          <div key={lang} className="flex flex-col gap-3">
            <Field label={t(`question${lang}`)} htmlFor={fid(`q${lang}`)} error={errorText(errors[`question${lang}`])}>
              <Input id={fid(`q${lang}`)} value={values[`question${lang}`]} onChange={(e) => set(`question${lang}`, e.target.value)} />
            </Field>
            <Field label={t(`answer${lang}`)} htmlFor={fid(`a${lang}`)} error={errorText(errors[`answer${lang}`])}>
              <Textarea id={fid(`a${lang}`)} rows={4} value={values[`answer${lang}`]} onChange={(e) => set(`answer${lang}`, e.target.value)} />
            </Field>
          </div>
        ))}
      </div>
      <p className="text-xs text-subtle-foreground">{t("hint")}</p>
      <div className="flex flex-wrap justify-end gap-2">
        {id ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("confirmDelete"))) return;
              startTransition(async () => {
                const res = await deleteFaqItemAction(id);
                if (!res.ok) setStatus(res.error);
              });
            }}
          >
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
