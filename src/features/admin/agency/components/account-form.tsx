"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { ACCOUNT_STATUSES, accountFormSchema, PLATFORMS_ALL, type AccountFormInput } from "@/lib/validation/admin-agency";
import { saveAccountAction } from "../actions";

type Option = { id: string; label: string };

export function AccountForm({ accountId, defaults, clients, staff }: { accountId: string | null; defaults: AccountFormInput; clients: Option[]; staff: Option[] }) {
  const t = useTranslations("admin.accounts.form");
  const ts = useTranslations("status.account");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError: setFieldError, formState } = useForm<AccountFormInput>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: defaults,
  });
  const { errors } = formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const res = await saveAccountAction(accountId, values);
          if (res && !res.ok) {
            for (const [f, k] of Object.entries(res.fieldErrors ?? {})) setFieldError(f as keyof AccountFormInput, { message: k });
            if (!res.fieldErrors) setError(res.error);
          }
        }),
      )}
    >
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("client")} htmlFor="acc-client" error={errorText(errors.clientId?.message)}>
          <Select id="acc-client" disabled={!!accountId} {...register("clientId")}>
            <option value="">—</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("platform")} htmlFor="acc-platform">
          <Select id="acc-platform" {...register("platform")}>
            {PLATFORMS_ALL.map((p) => (
              <option key={p} value={p}>
                {t(`platforms.${p}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("handle")} htmlFor="acc-handle" error={errorText(errors.handle?.message)}>
          <Input id="acc-handle" placeholder="@" {...register("handle")} />
        </Field>
        <Field label={t("url")} htmlFor="acc-url" error={errorText(errors.url?.message)}>
          <Input id="acc-url" type="url" placeholder="https://" {...register("url")} />
        </Field>
        <Field label={t("owner")} htmlFor="acc-owner">
          <Select id="acc-owner" {...register("ownerEmployeeId")}>
            <option value="">—</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("createdOn")} htmlFor="acc-created">
          <Input id="acc-created" type="date" {...register("createdOn")} />
        </Field>
        <Field label={t("status")} htmlFor="acc-status">
          <Select id="acc-status" {...register("status")}>
            {ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("followers")} htmlFor="acc-followers" error={errorText(errors.followersCount?.message)}>
          <Input id="acc-followers" inputMode="numeric" {...register("followersCount")} />
        </Field>
      </div>
      <Field label={t("passwordRef")} htmlFor="acc-ref" hint={t("passwordRefHint")} error={errorText(errors.passwordManagerRef?.message)}>
        <Input id="acc-ref" autoComplete="off" {...register("passwordManagerRef")} />
      </Field>
      <Field label={t("notes")} htmlFor="acc-notes">
        <Textarea id="acc-notes" rows={3} {...register("notes")} />
      </Field>
      <Button type="submit" className="self-end" disabled={pending}>
        {tc("save")}
      </Button>
    </form>
  );
}
