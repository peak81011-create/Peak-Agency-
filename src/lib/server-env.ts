import "server-only";
import { z } from "zod";

// Secrets serveur : lus uniquement côté serveur, validés au premier usage.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

let cached: z.infer<typeof serverSchema> | undefined;

export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return cached;
}
