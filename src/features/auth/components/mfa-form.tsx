"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { mfaCodeSchema, type MfaCodeInput } from "@/lib/validation/auth";
import { startMfaEnrollAction, verifyMfaAction } from "../actions";
import { useErrorText } from "./use-translated-error";

type Enrollment = { factorId: string; qrCode: string; secret: string };

/** Saisie du code TOTP ; en mode « enroll », affiche d'abord le QR code. */
export function MfaForm({ mode, next }: { mode: "enroll" | "challenge"; next?: string }) {
  const t = useTranslations("auth");
  const errorText = useErrorText();
  const [enrollment, setEnrollment] = useState<Enrollment>();
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<MfaCodeInput>({ resolver: zodResolver(mfaCodeSchema) });

  useEffect(() => {
    if (mode !== "enroll") return;
    startTransition(async () => {
      const res = await startMfaEnrollAction();
      if (res.ok && res.data) setEnrollment(res.data);
      else if (!res.ok) setFormError(res.error);
    });
  }, [mode]);

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setFormError(undefined);
      const res = await verifyMfaAction(values, enrollment?.factorId, next);
      if (res && !res.ok) setFormError(res.error);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <Callout tone="error">{errorText(formError)}</Callout> : null}
      {mode === "enroll" && enrollment ? (
        <div className="flex flex-col items-center gap-3">
          {/* QR code SVG fourni par Supabase (data URI) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qrCode} alt="" width={180} height={180} className="rounded-md border border-border bg-white p-2" />
          <p className="text-xs text-subtle-foreground">{t("mfa.secretLabel")}</p>
          <code className="break-all rounded-sm bg-muted px-2 py-1 font-mono text-sm">{enrollment.secret}</code>
        </div>
      ) : null}
      <Field label={t("mfa.code")} htmlFor="code" error={errorText(formState.errors.code?.message)}>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="text-center font-mono text-2xl tracking-[0.5em]"
          aria-invalid={!!formState.errors.code}
          {...register("code")}
        />
      </Field>
      <Button type="submit" size="lg" block disabled={pending || (mode === "enroll" && !enrollment)}>
        {t("mfa.submit")}
      </Button>
      <p className="text-center text-xs text-subtle-foreground">{t("mfa.lost")}</p>
    </form>
  );
}
