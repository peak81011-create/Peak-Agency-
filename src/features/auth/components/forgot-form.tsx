"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotSchema, type ForgotInput } from "@/lib/validation/auth";
import { forgotPasswordAction } from "../actions";
import { useErrorText } from "./use-translated-error";

export function ForgotForm() {
  const t = useTranslations("auth");
  const errorText = useErrorText();
  const [result, setResult] = useState<"sent" | string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const res = await forgotPasswordAction(values);
      setResult(res.ok ? "sent" : res.error);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field label={t("email")} htmlFor="email" error={errorText(formState.errors.email?.message)}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register("email")} />
      </Field>
      <Button type="submit" size="lg" block disabled={pending}>
        {t("forgot.submit")}
      </Button>
      {result === "sent" ? <Callout tone="ok">{t("forgot.sent")}</Callout> : null}
      {result && result !== "sent" ? <Callout tone="error">{errorText(result)}</Callout> : null}
    </form>
  );
}
