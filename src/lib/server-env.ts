import "server-only";
import { z } from "zod";

// Secrets serveur : lus uniquement côté serveur, validés au premier usage.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  // Facultatifs : sans clé Resend, les e-mails sont seulement écrits dans le journal du serveur.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Peak Clipping Agency <no-reply@example.com>"),
  CRON_SECRET: z.string().optional(),
});

let cached: z.infer<typeof serverSchema> | undefined;

export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
  });
  return cached;
}
