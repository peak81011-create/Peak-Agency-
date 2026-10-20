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
import {
  CHANNEL_KEYS,
  CONTENT_LANGUAGES,
  creatorProfileSchema,
  NICHES,
  type CreatorProfileInput,
} from "@/lib/validation/client";
import { saveCreatorProfileAction } from "../actions";

export function CreatorProfileForm({ defaults, onboarding }: { defaults: CreatorProfileInput; onboarding: boolean }) {
  const t = useTranslations("client.profile");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const [result, setResult] = useState<"saved" | string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, formState } = useForm<CreatorProfileInput>({
    resolver: zodResolver(creatorProfileSchema),
    defaultValues: defaults,
  });
  const { errors } = formState;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setResult(undefined);
      const res = await saveCreatorProfileAction(values, onboarding);
      if (!res) return;
      if (res.ok) setResult("saved");
      else {
        for (const [field, key] of Object.entries(res.fieldErrors ?? {})) setError(field as keyof CreatorProfileInput, { message: key });
        if (!res.fieldErrors) setResult(res.error);
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {result === "saved" ? <Callout tone="ok">{tc("saved")}</Callout> : null}
      {result && result !== "saved" ? <Callout tone="error">{errorText(result)}</Callout> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("creatorName")} htmlFor="creatorName" error={errorText(errors.creatorName?.message)}>
          <Input id="creatorName" aria-invalid={!!errors.creatorName} {...register("creatorName")} />
        </Field>
        <Field label={t("niche")} htmlFor="niche" error={errorText(errors.niche?.message)}>
          <Select id="niche" aria-invalid={!!errors.niche} {...register("niche")}>
            {NICHES.map((n) => (
              <option key={n} value={n}>
                {t(`niches.${n}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("language")} htmlFor="language" error={errorText(errors.language?.message)}>
          <Select id="language" {...register("language")}>
            {CONTENT_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {t(`languages.${l}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[13px] font-semibold">{t("channels")}</legend>
        <p className="-mt-1 text-xs text-subtle-foreground">{t("channelsHint")}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {CHANNEL_KEYS.map((key) => (
            <Field
              key={key}
              label={t(`channelNames.${key}`)}
              htmlFor={`channel-${key}`}
              optional={t("optional")}
              error={errorText(errors.channels?.[key]?.message)}
            >
              <Input
                id={`channel-${key}`}
                type="url"
                inputMode="url"
                placeholder="https://"
                aria-invalid={!!errors.channels?.[key]}
                {...register(`channels.${key}`)}
              />
            </Field>
          ))}
        </div>
        {errors.channels?.root?.message || errors.channels?.message ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errorText(errors.channels?.root?.message ?? errors.channels?.message)}
          </p>
        ) : null}
      </fieldset>

      <Field label={t("goals")} htmlFor="goals" optional={t("optional")} hint={t("goalsHint")} error={errorText(errors.goals?.message)}>
        <Textarea id="goals" rows={3} {...register("goals")} />
      </Field>
      <Field
        label={t("liveAvailability")}
        htmlFor="liveAvailability"
        optional={t("optional")}
        hint={t("liveAvailabilityHint")}
        error={errorText(errors.liveAvailability?.message)}
      >
        <Input id="liveAvailability" {...register("liveAvailability")} />
      </Field>
      <Field
        label={t("billingAddress")}
        htmlFor="billingAddress"
        optional={t("optional")}
        hint={t("billingAddressHint")}
        error={errorText(errors.billingAddress?.message)}
      >
        <Textarea id="billingAddress" rows={2} {...register("billingAddress")} />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-subtle-foreground">{t("editableLater")}</p>
        <Button type="submit" size="lg" disabled={pending}>
          {onboarding ? tc("continue") : tc("save")}
        </Button>
      </div>
    </form>
  );
}
