import { z } from "zod";

/** Contrôle de l'IBAN (ISO 13616, clé modulo 97). */
export function isValidIban(input: string): boolean {
  const iban = input.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

const text = (max = 200) => z.string().trim().max(max, { message: "tooLong" });

export const settingsFormSchemas = {
  company: z.object({
    legal_name: text(),
    trade_name: text(),
    legal_form: text(),
    siret: text(20).refine((v) => v === "" || /^\d{14}$/.test(v.replace(/\s/g, "")), { message: "siret" }),
    address: text(300),
    vat_number: text(30),
    vat_mention: text(200),
    email: z.union([z.literal(""), z.email({ message: "email" })]),
    phone: text(30),
    publication_director: text(),
    host: text(300),
  }),
  bank: z.object({
    holder: text(),
    iban: text(42).refine((v) => v === "" || isValidIban(v), { message: "iban" }),
    bic: text(11).refine((v) => v === "" || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(v.replace(/\s/g, "")), { message: "bic" }),
    bank_name: text(),
  }),
  billing: z.object({
    payment_reference_prefix: z.string().trim().regex(/^[A-Za-z0-9]{2,12}$/, { message: "prefix" }),
    invoice_prefix: z.string().trim().regex(/^[A-Za-z0-9]{1,12}$/, { message: "prefix" }),
    grace_days: z.string().trim().regex(/^\d{1,2}$/, { message: "number" }),
    reminder_days_before: z.string().trim().regex(/^\d{1,2}$/, { message: "number" }),
  }),
  notifications: z.object({ admin_email: z.union([z.literal(""), z.email({ message: "email" })]) }),
} as const;

export type SettingsFormKey = keyof typeof settingsFormSchemas;
