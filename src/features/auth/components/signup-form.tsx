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
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { signupAction } from "../actions";
import { useErrorText } from "./use-translated-error";

export function SignupForm({ intendedPlan }: { intendedPlan?: string }) {
  const t = useTranslations("auth");
  const errorText = useErrorText();
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, formState } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });
  const { errors } = formState;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setFormError(undefined);
      const res = await signupAction(values, intendedPlan);
      if (res && !res.ok) {
        for (const [field, key] of Object.entries(res.fieldErrors ?? {})) setError(field as keyof SignupInput, { message: key });
        if (!res.fieldErrors) setFormError(res.error);
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <Callout tone="error">{errorText(formError)}</Callout> : null}
      <Field label={t("fullName")} htmlFor="fullName" error={errorText(errors.fullName?.message)}>
        <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
      </Field>
      <Field label={t("creatorName")} htmlFor="creatorName" error={errorText(errors.creatorName?.message)}>
        <Input id="creatorName" autoComplete="nickname" aria-invalid={!!errors.creatorName} {...register("creatorName")} />
      </Field>
      <Field label={t("email")} htmlFor="email" error={errorText(errors.email?.message)}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label={t("password")} htmlFor="password" hint={t("passwordHint")} error={errorText(errors.password?.message)}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby="password-hint"
          {...register("password")}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-8 cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" className="mt-0.5 size-[18px] accent-primary" {...register("acceptTerms")} />
          <span>
            {t.rich("signup.acceptTerms", {
              terms: (chunks) => (
                <Link href="/legal/terms" className="text-forest-700">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/legal/privacy" className="text-forest-700">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.acceptTerms ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errorText(errors.acceptTerms.message)}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" block disabled={pending}>
        {t("signup.submit")}
      </Button>
      <p className="text-center text-[13px] text-muted-foreground">
        {t("signup.hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-forest-700">
          {t("signup.loginLink")}
        </Link>
      </p>
    </form>
  );
}
