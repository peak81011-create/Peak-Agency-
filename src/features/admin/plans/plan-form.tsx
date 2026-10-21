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
import { BILLING_PERIODS, PLATFORMS, planFormSchema, type PlanFormInput } from "@/lib/validation/plan";
import { savePlanAction } from "./actions";

export function PlanForm({ planId, defaults }: { planId: string | null; defaults: PlanFormInput }) {
  const t = useTranslations("admin.plans.form");
  const tp = useTranslations("plans");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError: setFieldError, formState } = useForm<PlanFormInput>({
    resolver: zodResolver(planFormSchema),
    defaultValues: defaults,
  });
  const { errors } = formState;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setError(undefined);
      const res = await savePlanAction(planId, values);
      if (res && !res.ok) {
        for (const [f, k] of Object.entries(res.fieldErrors ?? {})) setFieldError(f as keyof PlanFormInput, { message: k });
        if (!res.fieldErrors) setError(res.error);
      }
    }),
  );

  const text = (name: keyof PlanFormInput, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field label={label} htmlFor={name} error={errorText(errors[name]?.message as string | undefined)}>
      <Input id={name} aria-invalid={!!errors[name]} {...props} {...register(name)} />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {text("nameFr", t("nameFr"))}
        {text("nameEn", t("nameEn"))}
        <Field label={t("descriptionFr")} htmlFor="descriptionFr" error={errorText(errors.descriptionFr?.message)}>
          <Textarea id="descriptionFr" rows={2} {...register("descriptionFr")} />
        </Field>
        <Field label={t("descriptionEn")} htmlFor="descriptionEn" error={errorText(errors.descriptionEn?.message)}>
          <Textarea id="descriptionEn" rows={2} {...register("descriptionEn")} />
        </Field>
        {text("price", t("price"), { inputMode: "decimal" })}
        <Field label={t("billingPeriod")} htmlFor="billingPeriod">
          <Select id="billingPeriod" {...register("billingPeriod")}>
            {BILLING_PERIODS.map((p) => (
              <option key={p} value={p}>
                {tp(`periods.${p}`)}
              </option>
            ))}
          </Select>
        </Field>
        {text("clipsPerPeriod", t("clipsPerPeriod"), { inputMode: "numeric" })}
        {text("accountsIncluded", t("accountsIncluded"), { inputMode: "numeric" })}
        {text("deliveryDays", t("deliveryDays"), { inputMode: "numeric" })}
        {text("sortOrder", t("sortOrder"), { inputMode: "numeric" })}
        {text("slug", t("slug"))}
        {text("taglineFr", t("taglineFr"))}
        {text("taglineEn", t("taglineEn"))}
        {text("clipLengthFr", t("clipLengthFr"))}
        {text("clipLengthEn", t("clipLengthEn"))}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-semibold">{t("platforms")}</legend>
        <div className="flex flex-wrap gap-4">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex min-h-8 items-center gap-2 text-sm">
              <input type="checkbox" value={p} className="size-[18px] accent-primary" {...register("platforms")} />
              {tp(`platformNames.${p}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("featuresFr")} htmlFor="featuresFr" hint={t("featuresHint")} error={errorText(errors.featuresFr?.message)}>
          <Textarea id="featuresFr" rows={4} {...register("featuresFr")} />
        </Field>
        <Field label={t("featuresEn")} htmlFor="featuresEn" hint={t("featuresHint")} error={errorText(errors.featuresEn?.message)}>
          <Textarea id="featuresEn" rows={4} {...register("featuresEn")} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("detailsFr")} htmlFor="detailsFr" hint={t("detailsHint")} error={errorText(errors.detailsFr?.message)}>
          <Textarea id="detailsFr" rows={10} {...register("detailsFr")} />
        </Field>
        <Field label={t("detailsEn")} htmlFor="detailsEn" hint={t("detailsHint")} error={errorText(errors.detailsEn?.message)}>
          <Textarea id="detailsEn" rows={10} {...register("detailsEn")} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex min-h-8 items-center gap-2 text-sm">
          <input type="checkbox" className="size-[18px] accent-primary" {...register("isVisible")} />
          {t("isVisible")}
        </label>
        <label className="flex min-h-8 items-center gap-2 text-sm">
          <input type="checkbox" className="size-[18px] accent-primary" {...register("isFeatured")} />
          {t("isFeatured")}
        </label>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
