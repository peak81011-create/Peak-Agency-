import type { Locale } from "@/i18n/routing";

/** Nombre compact (12 400 → « 12 k » ; 2 400 000 → « 2,4 M »). */
export function formatCompact(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
