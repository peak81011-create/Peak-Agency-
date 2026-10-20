"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { createRequestAction } from "@/features/agency/actions";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { useRouter } from "@/i18n/navigation";
import { REQUEST_TYPES, requestSchema, type RequestInput } from "@/lib/validation/agency";

export function RequestForm() {
  const t = useTranslations("requests.form");
  const tt = useTranslations("requests.types");
  const errorText = useErrorText();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError: setFieldError } = useForm<RequestInput>({
    resolver: zodResolver(requestSchema),
    defaultValues: { type: "clip", title: "", description: "", desiredDueDate: "" },
  });
  const { errors } = formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          setError(undefined);
          const res = await createRequestAction(values);
          if (res.ok && res.data) router.push(`/app/requests/${res.data.id}`);
          else if (!res.ok) {
            for (const [f, k] of Object.entries(res.fieldErrors ?? {})) setFieldError(f as keyof RequestInput, { message: k });
            if (!res.fieldErrors) setError(res.error);
          }
        }),
      )}
    >
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("type")} htmlFor="req-type">
          <Select id="req-type" {...register("type")}>
            {REQUEST_TYPES.map((r) => (
              <option key={r} value={r}>
                {tt(r)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("dueDate")} htmlFor="req-due" optional={t("optional")}>
          <Input id="req-due" type="date" {...register("desiredDueDate")} />
        </Field>
      </div>
      <Field label={t("title")} htmlFor="req-title" error={errorText(errors.title?.message)}>
        <Input id="req-title" aria-invalid={!!errors.title} {...register("title")} />
      </Field>
      <Field label={t("description")} htmlFor="req-description" error={errorText(errors.description?.message)}>
        <Textarea id="req-description" rows={5} aria-invalid={!!errors.description} {...register("description")} />
      </Field>
      <Button type="submit" size="lg" className="self-end" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
