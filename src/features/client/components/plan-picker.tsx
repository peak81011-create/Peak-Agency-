"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import type { PlanView } from "@/features/plans/present";
import { cn } from "@/lib/utils";
import { choosePlanAction } from "../actions";

export function PlanPicker({ plans, initial }: { plans: PlanView[]; initial?: string }) {
  const t = useTranslations("client.plan");
  const errorText = useErrorText();
  const [selected, setSelected] = useState(initial ?? plans.find((p) => p.featured)?.id ?? plans[0]?.id);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const current = plans.find((p) => p.id === selected);

  return (
    <div className="flex flex-col gap-5">
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      <div role="radiogroup" aria-label={t("title")} className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const on = plan.id === selected;
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSelected(plan.id)}
              className={cn(
                "flex flex-col gap-3 rounded-lg border-2 bg-card p-5 text-left",
                on ? "border-primary ring-3 ring-sage-300" : "border-border hover:border-border-strong",
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-display text-lg font-bold [font-stretch:108%]">{plan.name}</span>
                <span
                  aria-hidden
                  className={cn("size-5 shrink-0 rounded-full border-2", on ? "border-[6px] border-primary" : "border-border-strong")}
                />
              </span>
              <span className="font-display text-3xl font-extrabold [font-stretch:115%]">
                {plan.price} <span className="font-sans text-sm font-normal text-muted-foreground">{plan.period}</span>
              </span>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {plan.includes.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted p-4">
        <p className="text-sm">
          {current ? t("summary", { name: current.name, price: `${current.price} ${current.period}` }) : null}
          <span className="block text-xs text-subtle-foreground">{t("summaryHint")}</span>
        </p>
        <Button
          size="lg"
          disabled={!selected || pending}
          onClick={() =>
            startTransition(async () => {
              setError(undefined);
              const res = await choosePlanAction(selected!);
              if (res && !res.ok) setError(res.error);
            })
          }
        >
          {t("submit")}
        </Button>
      </div>
    </div>
  );
}
