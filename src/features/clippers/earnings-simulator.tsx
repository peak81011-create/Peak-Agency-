"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { Locale } from "@/i18n/routing";
import { type EarningRules, calculerGainClip } from "@/lib/earnings/calculate";
import { formatMoney } from "@/lib/format";

const STEPS = [0, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];

/** Simulateur de gains : même fonction que le calcul réel des paiements. */
export function EarningsSimulator({ rules }: { rules: EarningRules }) {
  const t = useTranslations("clippers.simulator");
  const locale = useLocale() as Locale;
  const id = useId();
  const [index, setIndex] = useState(5);
  const views = STEPS[index];
  const fmtViews = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB").format(views);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 md:p-8">
      <label htmlFor={id} className="flex flex-wrap items-baseline justify-between gap-2 font-semibold">
        {t("label")}
        <span className="font-display text-2xl font-extrabold tabular-nums [font-stretch:115%]" data-testid="simulator-views">
          {fmtViews}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={STEPS.length - 1}
        step={1}
        value={index}
        aria-valuetext={t("views", { views: fmtViews })}
        onChange={(e) => setIndex(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-forest-700"
      />
      <p className="text-lg" aria-live="polite">
        {t("earn")}{" "}
        <strong className="font-display text-3xl font-extrabold [font-stretch:115%]" data-testid="simulator-result">
          {formatMoney(calculerGainClip(rules, views), "EUR", locale)}
        </strong>
      </p>
      <p className="text-xs text-subtle-foreground">{t("disclaimer")}</p>
    </div>
  );
}
