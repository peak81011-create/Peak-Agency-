"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";
import { sendContactAction } from "./contact-actions";

export function ContactForm() {
  const t = useTranslations("contact");
  const errorText = useErrorText();
  const [status, setStatus] = useState<"sent" | string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, reset, formState } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", channelUrl: "", message: "", website: "" },
  });
  const { errors } = formState;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setStatus(undefined);
      const res = await sendContactAction(values);
      if (res.ok) {
        setStatus("sent");
        reset();
      } else {
        for (const [f, k] of Object.entries(res.fieldErrors ?? {})) setError(f as keyof ContactInput, { message: k });
        if (!res.fieldErrors) setStatus(res.error);
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {status === "sent" ? <Callout tone="ok">{t("sent")}</Callout> : null}
      {status && status !== "sent" ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("name")} htmlFor="name" error={errorText(errors.name?.message)}>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label={t("email")} htmlFor="email" error={errorText(errors.email?.message)}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
      </div>
      <Field label={t("channelUrl")} htmlFor="channelUrl" optional={t("optional")} error={errorText(errors.channelUrl?.message)}>
        <Input id="channelUrl" type="url" placeholder="https://" aria-invalid={!!errors.channelUrl} {...register("channelUrl")} />
      </Field>
      <Field label={t("message")} htmlFor="message" error={errorText(errors.message?.message)}>
        <Textarea id="message" rows={6} aria-invalid={!!errors.message} {...register("message")} />
      </Field>
      {/* Champ piège pour les robots : masqué aux humains et aux lecteurs d'écran */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <Button type="submit" size="lg" className="self-start" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
