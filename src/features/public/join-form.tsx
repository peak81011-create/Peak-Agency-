"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizedPath } from "@/lib/public-paths";
import { EXPERIENCE_LEVELS, HOURS_PER_WEEK, MAX_PORTFOLIO_LINKS, joinSchema, type JoinInput } from "@/lib/validation/join";
import { sendJoinApplicationAction } from "./join-actions";

/** Candidature clipper, en une seule page (tutoiement). */
export function JoinForm({ minAge, sentMessage }: { minAge: string; sentMessage: string }) {
  const t = useTranslations("apply.form");
  const locale = useLocale() as Locale;
  const errorText = useErrorText();
  const [status, setStatus] = useState<"sent" | string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, formState } = useForm<JoinInput>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      nickname: "",
      firstName: "",
      email: "",
      country: "",
      languages: "",
      portfolioLinks: Array(MAX_PORTFOLIO_LINKS).fill(""),
      software: "",
      motivation: "",
      website: "",
    },
  });
  const { errors } = formState;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setStatus(undefined);
      const res = await sendJoinApplicationAction(values);
      if (res.ok) setStatus("sent");
      else {
        for (const [f, k] of Object.entries(res.fieldErrors ?? {})) setError(f as keyof JoinInput, { message: k });
        if (!res.fieldErrors) setStatus(res.error);
      }
    }),
  );

  if (status === "sent") {
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="font-display text-2xl font-bold [font-stretch:110%]">{t("sentTitle")}</p>
        <p className="text-muted-foreground">{sentMessage}</p>
      </div>
    );
  }

  const linkError = errors.portfolioLinks?.message ?? errors.portfolioLinks?.root?.message ?? (Array.isArray(errors.portfolioLinks) ? errors.portfolioLinks.find(Boolean)?.message : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {status ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("nickname")} htmlFor="apply-nickname" error={errorText(errors.nickname?.message)}>
          <Input id="apply-nickname" aria-invalid={!!errors.nickname} {...register("nickname")} />
        </Field>
        <Field label={t("firstName")} htmlFor="apply-first-name" error={errorText(errors.firstName?.message)}>
          <Input id="apply-first-name" autoComplete="given-name" aria-invalid={!!errors.firstName} {...register("firstName")} />
        </Field>
      </div>
      <Field label={t("email")} htmlFor="apply-email" error={errorText(errors.email?.message)}>
        <Input id="apply-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("country")} htmlFor="apply-country" error={errorText(errors.country?.message)}>
          <Input id="apply-country" autoComplete="country-name" aria-invalid={!!errors.country} {...register("country")} />
        </Field>
        <Field label={t("languages")} htmlFor="apply-languages" error={errorText(errors.languages?.message)}>
          <Input id="apply-languages" placeholder={t("languagesPlaceholder")} aria-invalid={!!errors.languages} {...register("languages")} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-semibold">{t("portfolio")}</legend>
        <p className="text-xs text-subtle-foreground">{t("portfolioHint")}</p>
        {Array.from({ length: MAX_PORTFOLIO_LINKS }, (_, i) => (
          <Input
            key={i}
            type="url"
            placeholder="https://"
            aria-label={t("portfolioLink", { n: i + 1 })}
            aria-invalid={!!linkError && i === 0}
            {...register(`portfolioLinks.${i}` as const)}
          />
        ))}
        {linkError ? <p className="text-xs text-destructive">{errorText(linkError)}</p> : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("software")} htmlFor="apply-software" error={errorText(errors.software?.message)}>
          <Input id="apply-software" placeholder={t("softwarePlaceholder")} aria-invalid={!!errors.software} {...register("software")} />
        </Field>
        <Field label={t("experience")} htmlFor="apply-experience" error={errorText(errors.experience?.message)}>
          <Select id="apply-experience" defaultValue="" aria-invalid={!!errors.experience} {...register("experience")}>
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
      </div>
      <Field label={t("hours")} htmlFor="apply-hours" error={errorText(errors.hoursPerWeek?.message)}>
        <Select id="apply-hours" defaultValue="" aria-invalid={!!errors.hoursPerWeek} {...register("hoursPerWeek")}>
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
      <Field label={t("motivation")} htmlFor="apply-motivation" optional={t("optional")} error={errorText(errors.motivation?.message)}>
        <Textarea id="apply-motivation" rows={4} {...register("motivation")} />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-[18px] accent-primary" {...register("ageConfirmed")} />
        <span>{t("age", { age: minAge })}</span>
      </label>
      {errors.ageConfirmed ? <p className="-mt-3 text-xs text-destructive">{errorText(errors.ageConfirmed.message)}</p> : null}
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-[18px] accent-primary" {...register("privacyAccepted")} />
        <span>
          {t.rich("privacy", {
            link: (chunks) => (
              <Link href="/legal/privacy" className="font-semibold text-forest-700">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {errors.privacyAccepted ? <p className="-mt-3 text-xs text-destructive">{errorText(errors.privacyAccepted.message)}</p> : null}
      {/* Champ piège pour les robots : masqué aux humains et aux lecteurs d'écran */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="apply-website">Website</label>
        <input id="apply-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <Button type="submit" size="lg" className="self-start" disabled={pending}>
        {t("submit")}
      </Button>
      <p className="text-xs text-subtle-foreground">
        {t.rich("terms", {
          link: (chunks) => (
            <Link href={localizedPath("/legal/clippers", locale)} className="font-semibold text-forest-700">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
