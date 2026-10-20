import type { Locale } from "@/i18n/routing";

const intlLocale = (locale: Locale) => (locale === "fr" ? "fr-FR" : "en-GB");

export function formatMoney(cents: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency }).format(cents / 100);
}

export function formatDate(value: string | Date | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value.length === 10 ? `${value}T12:00:00Z` : value) : value;
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeZone: "Europe/Paris" }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(typeof value === "string" ? new Date(value) : value);
}

/** IBAN lisible par blocs de 4 caractères. */
export function formatIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

/** Euros saisis (« 890 », « 890,50 ») → centimes ; null si invalide. */
export function parseEurosToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
