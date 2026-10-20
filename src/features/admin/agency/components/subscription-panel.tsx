"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { updateSubscriptionAction } from "../actions";

/** Actions de l'agence sur l'abonnement d'un client (chaque action est tracée au journal). */
export function SubscriptionPanel({
  clientId,
  status,
  plans,
  currentPlanId,
  customPrice,
  requiresValidation,
}: {
  clientId: string;
  status: string;
  plans: { id: string; name: string }[];
  currentPlanId: string | null;
  customPrice: string;
  requiresValidation: boolean;
}) {
  const t = useTranslations("admin.clients.subscription");
  const errorText = useErrorText();
  const [periodEnd, setPeriodEnd] = useState("");
  const [planId, setPlanId] = useState(currentPlanId ?? "");
  const [price, setPrice] = useState(customPrice);
  const [message, setMessage] = useState<"ok" | string>();
  const [pending, startTransition] = useTransition();

  const run = (input: Parameters<typeof updateSubscriptionAction>[1]) =>
    startTransition(async () => {
      const res = await updateSubscriptionAction(clientId, input);
      setMessage(res.ok ? "ok" : res.error);
    });

  return (
    <div className="flex flex-col gap-4">
      {message === "ok" ? <Callout tone="ok">{t("done")}</Callout> : null}
      {message && message !== "ok" ? <Callout tone="error">{errorText(message)}</Callout> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-end gap-2">
          <Field label={t("extendTo")} htmlFor="sub-end" className="grow">
            <Input id="sub-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </Field>
          <Button variant="secondary" disabled={pending || !periodEnd} onClick={() => run({ action: "extend", periodEnd })}>
            {t("extend")}
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <Field label={t("plan")} htmlFor="sub-plan" className="grow">
            <Select id="sub-plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="" disabled>
                —
              </option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button variant="secondary" disabled={pending || !planId || planId === currentPlanId} onClick={() => run({ action: "change_plan", planId })}>
            {t("changePlan")}
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <Field label={t("customPrice")} htmlFor="sub-price" hint={t("customPriceHint")} className="grow">
            <Input id="sub-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Button variant="secondary" disabled={pending} onClick={() => run({ action: "custom_price", price })}>
            {t("apply")}
          </Button>
        </div>
        <label className="flex min-h-11 items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            className="size-[18px] accent-primary"
            checked={requiresValidation}
            disabled={pending}
            onChange={() => run({ action: "toggle_validation" })}
          />
          {t("requiresValidation")}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {status === "suspendu" || status === "archive" ? (
          <Button variant="secondary" disabled={pending} onClick={() => run({ action: "reactivate" })}>
            {t("reactivate")}
          </Button>
        ) : (
          <Button variant="destructive-ghost" disabled={pending} onClick={() => run({ action: "suspend" })}>
            {t("suspend")}
          </Button>
        )}
        {status !== "archive" ? (
          <Button variant="ghost" disabled={pending} onClick={() => run({ action: "archive" })}>
            {t("archive")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
