"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { refusePaymentAction, validatePaymentAction } from "./actions";

const REASONS = ["amount", "reference", "unreadable", "notReceived", "other"] as const;

/** Contrôles à cocher puis Valider / Refuser (maquette AdminPayments). */
export function PaymentReview({ paymentId }: { paymentId: string }) {
  const t = useTranslations("admin.payments.review");
  const errorText = useErrorText();
  const router = useRouter();
  const [checks, setChecks] = useState([false, false, false]);
  const [refusing, setRefusing] = useState(false);
  const [reasonKey, setReasonKey] = useState<(typeof REASONS)[number]>("amount");
  const [message, setMessage] = useState(t("messages.amount"));
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<"validated" | "refused">();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: "validated" | "refused") =>
    startTransition(async () => {
      setError(undefined);
      const res = await fn();
      if (res.ok) {
        setDone(ok);
        router.refresh();
      } else setError(res.error);
    });

  if (done) return <Callout tone="ok">{t(done)}</Callout>;

  return (
    <div className="flex flex-col gap-4">
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-semibold">{t("checks")}</legend>
        {(["checkAmount", "checkReference", "checkReceived"] as const).map((key, i) => (
          <label key={key} className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="size-[18px] accent-primary"
              checked={checks[i]}
              onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
            />
            {t(key)}
          </label>
        ))}
      </fieldset>

      {refusing ? (
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <Field label={t("reason")} htmlFor="refuse-reason">
            <Select
              id="refuse-reason"
              value={reasonKey}
              onChange={(e) => {
                const key = e.target.value as (typeof REASONS)[number];
                setReasonKey(key);
                setMessage(key === "other" ? "" : t(`messages.${key}`));
              }}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`reasons.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("message")} htmlFor="refuse-message" hint={t("messageHint")}>
            <Textarea id="refuse-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setRefusing(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => run(() => refusePaymentAction(paymentId, message), "refused")}>
              {t("confirmRefuse")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="destructive-ghost" onClick={() => setRefusing(true)} disabled={pending}>
            {t("refuse")}
          </Button>
          <Button
            disabled={pending || !checks.every(Boolean)}
            onClick={() => run(() => validatePaymentAction(paymentId), "validated")}
          >
            {t("validate")}
          </Button>
        </div>
      )}
    </div>
  );
}
