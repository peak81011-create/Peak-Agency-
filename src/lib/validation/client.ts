import { z } from "zod";

// Schémas partagés navigateur/serveur pour l'espace client.
// Les messages sont des clés du namespace « validation ».

export const NICHES = ["gaming", "lifestyle", "business", "humour", "sport", "tech", "beaute", "education", "autre"] as const;
export const CHANNEL_KEYS = ["youtube", "twitch", "tiktok", "instagram", "kick", "other"] as const;
export const CONTENT_LANGUAGES = ["fr", "en", "other"] as const;

const optionalUrl = z
  .string()
  .trim()
  .max(300, { message: "tooLong" })
  .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), { message: "url" });

const optionalText = (max: number) => z.string().trim().max(max, { message: "tooLong" });

export const creatorProfileSchema = z
  .object({
    creatorName: z.string().trim().min(1, { message: "required" }).max(120, { message: "tooLong" }),
    niche: z.enum(NICHES, { message: "required" }),
    language: z.enum(CONTENT_LANGUAGES, { message: "required" }),
    channels: z.object(Object.fromEntries(CHANNEL_KEYS.map((k) => [k, optionalUrl])) as Record<
      (typeof CHANNEL_KEYS)[number],
      typeof optionalUrl
    >),
    goals: optionalText(2000),
    liveAvailability: optionalText(500),
    billingAddress: optionalText(500),
  })
  .refine((v) => Object.values(v.channels).some((url) => url !== ""), {
    message: "channelRequired",
    path: ["channels"],
  });
export type CreatorProfileInput = z.infer<typeof creatorProfileSchema>;

export const PROOF_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;

export const proofUploadSchema = z.object({
  paymentId: z.uuid(),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(PROOF_MIME_TYPES, { message: "proofType" }),
  size: z.number().int().positive().max(PROOF_MAX_BYTES, { message: "proofSize" }),
});
export type ProofUploadInput = z.infer<typeof proofUploadSchema>;

/** Nom de fichier sûr pour le stockage (lettres, chiffres, tirets). */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) : "";
  return `${base || "fichier"}${ext ? `.${ext}` : ""}`;
}
