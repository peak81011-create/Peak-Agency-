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
import { resetSchema, type ResetInput } from "@/lib/validation/auth";
import { resetPasswordAction } from "../actions";
import { useErrorText } from "./use-translated-error";

export function ResetForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const [result, setResult] = useState<"done" | string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const res = await resetPasswordAction(values);
      setResult(res.ok ? "done" : res.error);
    }),
  );

  if (result === "done") {
    return (
      <div className="flex flex-col gap-5">
        <Callout tone="ok">{t("reset.done")}</Callout>
        <Button asChild size="lg" block>
          <Link href="/app">{tc("mySpace")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {result ? <Callout tone="error">{errorText(result)}</Callout> : null}
      <Field
        label={t("newPassword")}
        htmlFor="password"
        hint={t("passwordHint")}
        error={errorText(formState.errors.password?.message)}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!formState.errors.password}
          {...register("password")}
        />
      </Field>
      <Button type="submit" size="lg" block disabled={pending}>
        {t("reset.submit")}
      </Button>
    </form>
  );
}
