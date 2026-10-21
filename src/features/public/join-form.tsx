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
import { EXPERIENCE_LEVELS, HOURS_PER_WEEK, JOIN_PLATFORMS, joinSchema, type JoinInput } from "@/lib/validation/join";
import { sendJoinApplicationAction } from "./join-actions";

const PLATFORM_LABELS = { tiktok: "TikTok", instagram: "Instagram Reels", youtube: "YouTube Shorts" } as const;

export function JoinForm() {
  const t = useTranslations("join.form");
  const errorText = useErrorText();
  const [status, setStatus] = useState<"sent" | string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, reset, formState } = useForm<JoinInput>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      fullName: "",
      email: "",
      portfolioUrl: "",
      platforms: [],
      tools: "",
      languages: "",
      message: "",
      website: "",
    },
  });
  const { errors } = formState;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setStatus(undefined);
      const res = await sendJoinApplicationAction(values);
      if (res.ok) {
        setStatus("sent");
        reset();
      } else {
        for (const [f, k] of Object.entries(res.fieldErrors ?? {})) setError(f as keyof JoinInput, { message: k });
        if (!res.fieldErrors) setStatus(res.error);
      }
    }),
  );

  if (status === "sent") {
    return (
      <Callout tone="ok">
        <strong className="block">{t("sentTitle")}</strong>
        {t("sent")}
      </Callout>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {status ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("fullName")} htmlFor="join-name" error={errorText(errors.fullName?.message)}>
          <Input id="join-name" autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
        </Field>
        <Field label={t("email")} htmlFor="join-email" error={errorText(errors.email?.message)}>
          <Input id="join-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
      </div>
      <Field label={t("portfolio")} htmlFor="join-portfolio" optional={t("optional")} hint={t("portfolioHint")} error={errorText(errors.portfolioUrl?.message)}>
        <Input id="join-portfolio" type="url" placeholder="https://" aria-invalid={!!errors.portfolioUrl} {...register("portfolioUrl")} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-semibold">{t("platforms")}</legend>
        <div className="flex flex-wrap gap-2">
          {JOIN_PLATFORMS.map((p) => (
            <label
              key={p}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border-strong bg-card px-3.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
            >
              <input type="checkbox" value={p} className="sr-only" {...register("platforms")} />
              {PLATFORM_LABELS[p]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("experience")} htmlFor="join-experience" error={errorText(errors.experience?.message)}>
          <Select id="join-experience" defaultValue="" aria-invalid={!!errors.experience} {...register("experience")}>
            <option value="" disabled>
              {t("choose")}
            </option>
            {EXPERIENCE_LEVELS.map((x) => (
              <option key={x} value={x}>
                {t(`experiences.${x}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("hours")} htmlFor="join-hours" error={errorText(errors.hoursPerWeek?.message)}>
          <Select id="join-hours" defaultValue="" aria-invalid={!!errors.hoursPerWeek} {...register("hoursPerWeek")}>
            <option value="" disabled>
              {t("choose")}
            </option>
            {HOURS_PER_WEEK.map((x) => (
              <option key={x} value={x}>
                {t(`hoursOptions.${x}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("tools")} htmlFor="join-tools" optional={t("optional")} error={errorText(errors.tools?.message)}>
          <Input id="join-tools" placeholder={t("toolsPlaceholder")} {...register("tools")} />
        </Field>
        <Field label={t("languages")} htmlFor="join-languages" optional={t("optional")} error={errorText(errors.languages?.message)}>
          <Input id="join-languages" placeholder={t("languagesPlaceholder")} {...register("languages")} />
        </Field>
      </div>
      <Field label={t("message")} htmlFor="join-message" optional={t("optional")} error={errorText(errors.message?.message)}>
        <Textarea id="join-message" rows={5} placeholder={t("messagePlaceholder")} {...register("message")} />
      </Field>
      {/* Champ piège pour les robots : masqué aux humains et aux lecteurs d'écran */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="join-website">Website</label>
        <input id="join-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <p className="text-xs text-subtle-foreground">{t("privacy")}</p>
      <Button type="submit" size="lg" className="self-start" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
