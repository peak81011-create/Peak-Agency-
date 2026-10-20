import { z } from "zod";

export const PLATFORMS = ["tiktok", "instagram", "youtube"] as const;
export const BILLING_PERIODS = ["mensuel", "trimestriel", "annuel", "unique"] as const;

const count = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,5}$/.test(v), { message: "number" });

// Formulaire d'offre (admin). Prix saisi en euros, converti en centimes côté serveur.
export const planFormSchema = z.object({
  nameFr: z.string().trim().min(1, { message: "required" }).max(80, { message: "tooLong" }),
  nameEn: z.string().trim().min(1, { message: "required" }).max(80, { message: "tooLong" }),
  descriptionFr: z.string().trim().max(500, { message: "tooLong" }),
  descriptionEn: z.string().trim().max(500, { message: "tooLong" }),
  price: z.string().trim().regex(/^\d+([.,]\d{1,2})?$/, { message: "price" }),
  billingPeriod: z.enum(BILLING_PERIODS),
  clipsPerPeriod: count,
  accountsIncluded: count,
  deliveryDays: count,
  platforms: z.array(z.enum(PLATFORMS)),
  featuresFr: z.string().max(2000, { message: "tooLong" }),
  featuresEn: z.string().max(2000, { message: "tooLong" }),
  sortOrder: z.string().trim().regex(/^-?\d{1,4}$/, { message: "number" }),
  isVisible: z.boolean(),
  isFeatured: z.boolean(),
});
export type PlanFormInput = z.infer<typeof planFormSchema>;

/** Une ligne par avantage, lignes vides ignorées. */
export const linesToList = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20);
