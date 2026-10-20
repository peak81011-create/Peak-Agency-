import "server-only";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Paramètres de l'agence (table settings). Lus côté serveur uniquement :
// la table n'est pas lisible par les clients, le serveur n'expose que le
// nécessaire (ex. IBAN sur la page de paiement).

const str = z.string().trim().max(500).catch("");

export const companySchema = z.object({
  legal_name: str,
  trade_name: str,
  legal_form: str,
  siret: str,
  address: str,
  vat_number: str,
  vat_mention: str,
  email: str,
  phone: str,
  publication_director: str,
  host: str,
});

export const bankSchema = z.object({ holder: str, iban: str, bic: str, bank_name: str });

export const billingSchema = z.object({
  payment_reference_prefix: z.string().trim().max(12).catch("PEAK"),
  invoice_prefix: z.string().trim().max(12).catch("F"),
  grace_days: z.coerce.number().int().min(0).max(90).catch(7),
  reminder_days_before: z.coerce.number().int().min(1).max(60).catch(7),
  currency: z.string().length(3).catch("EUR"),
});

export const notificationSettingsSchema = z.object({ admin_email: str });

export const SETTINGS = {
  company: companySchema,
  bank: bankSchema,
  billing: billingSchema,
  notifications: notificationSettingsSchema,
} as const;

export type SettingsKey = keyof typeof SETTINGS;
export type Settings<K extends SettingsKey> = z.infer<(typeof SETTINGS)[K]>;

export async function getSettings<K extends SettingsKey>(key: K): Promise<Settings<K>> {
  const { data } = await createSupabaseAdminClient().from("settings").select("value").eq("key", key).maybeSingle();
  return SETTINGS[key].parse(data?.value ?? {}) as Settings<K>;
}

/** Champs obligatoires sur une facture française (pour alerter l'admin). */
export function missingInvoiceFields(company: Settings<"company">): (keyof Settings<"company">)[] {
  const required: (keyof Settings<"company">)[] = ["legal_name", "legal_form", "siret", "address", "vat_mention"];
  return required.filter((k) => !company[k]);
}

export function isBankConfigured(bank: Settings<"bank">): boolean {
  return Boolean(bank.holder && bank.iban && bank.bic);
}
