"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { inviteClientSchema, type InviteClientInput } from "@/lib/validation/admin-agency";
import { inviteClientAction } from "../actions";

export function InviteClientForm() {
  const t = useTranslations("admin.clients.invite");
  const tc = useTranslations("common");
  const locale = useLocale();
  const errorText = useErrorText();
  const [status, setStatus] = useState<"sent" | string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState } = useForm<InviteClientInput>({
    resolver: zodResolver(inviteClientSchema),
    defaultValues: { email: "", fullName: "", creatorName: "", locale: locale === "en" ? "en" : "fr" },
  });
  const { errors } = formState;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">{t("lead")}</p>
      <form
        noValidate
        className="grid gap-4 md:grid-cols-2"
        onSubmit={handleSubmit((values) =>
          startTransition(async () => {
            const res = await inviteClientAction(values);
            setStatus(res.ok ? "sent" : res.error);
            if (res.ok) reset();
          }),
        )}
      >
        {status === "sent" ? <Callout tone="ok" className="md:col-span-2">{t("sent")}</Callout> : null}
        {status && status !== "sent" ? <Callout tone="error" className="md:col-span-2">{errorText(status)}</Callout> : null}
        <Field label={t("fullName")} htmlFor="inv-name" error={errorText(errors.fullName?.message)}>
          <Input id="inv-name" {...register("fullName")} />
        </Field>
        <Field label={t("creatorName")} htmlFor="inv-creator" error={errorText(errors.creatorName?.message)}>
          <Input id="inv-creator" {...register("creatorName")} />
        </Field>
        <Field label={t("email")} htmlFor="inv-email" error={errorText(errors.email?.message)}>
          <Input id="inv-email" type="email" {...register("email")} />
        </Field>
        <Field label={t("locale")} htmlFor="inv-locale">
          <Select id="inv-locale" {...register("locale")}>
            <option value="fr">{tc("languageLong.fr")}</option>
            <option value="en">{tc("languageLong.en")}</option>
          </Select>
        </Field>
        <Button type="submit" className="md:col-span-2 md:justify-self-end" disabled={pending}>
          {t("submit")}
        </Button>
      </form>
    </Card>
  );
}
