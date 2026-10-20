"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { loginAction } from "../actions";
import { useErrorText } from "./use-translated-error";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const t = useTranslations("auth");
  const errorText = useErrorText();
  const [formError, setFormError] = useState<string | undefined>(initialError);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const { errors } = formState;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setFormError(undefined);
      const res = await loginAction(values, next);
      if (res && !res.ok) {
        for (const [field, key] of Object.entries(res.fieldErrors ?? {})) setError(field as keyof LoginInput, { message: key });
        if (!res.fieldErrors) setFormError(res.error);
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <Callout tone="error">{errorText(formError)}</Callout> : null}
      <Field label={t("email")} htmlFor="email" error={errorText(errors.email?.message)}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label={t("password")} htmlFor="password" error={errorText(errors.password?.message)}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </Field>
      <Link href="/forgot-password" className="-mt-2 self-end text-[13px] text-forest-700">
        {t("login.forgot")}
      </Link>
      <Button type="submit" size="lg" block disabled={pending}>
        {t("login.submit")}
      </Button>
      <p className="text-center text-[13px] text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link href="/signup" className="font-semibold text-forest-700">
          {t("login.createAccount")}
        </Link>
      </p>
    </form>
  );
}
