import { z } from "zod";

export const JOIN_PLATFORMS = ["tiktok", "instagram", "youtube"] as const;
export const EXPERIENCE_LEVELS = ["debutant", "intermediaire", "confirme"] as const;
export const HOURS_PER_WEEK = ["moins_10", "10_20", "20_35", "temps_plein"] as const;
export const APPLICATION_STATUSES = ["nouvelle", "en_cours", "acceptee", "refusee"] as const;

const optionalText = (max: number) => z.string().trim().max(max, { message: "tooLong" });

/** Candidature d'un clipper (page publique « Rejoindre la team »). */
export const joinSchema = z.object({
  fullName: z.string().trim().min(1, { message: "required" }).max(120, { message: "tooLong" }),
  email: z.email({ message: "email" }).max(254, { message: "tooLong" }),
  portfolioUrl: optionalText(300).refine((v) => v === "" || /^https:\/\/[^\s]+\.[^\s]+$/i.test(v), { message: "url" }),
  platforms: z.array(z.enum(JOIN_PLATFORMS)),
  experience: z.enum(EXPERIENCE_LEVELS, { message: "required" }),
  tools: optionalText(300),
  hoursPerWeek: z.enum(HOURS_PER_WEEK, { message: "required" }),
  languages: optionalText(200),
  message: optionalText(3000),
  // Champ piège invisible : un humain le laisse vide.
  website: z.string().max(0).optional().or(z.literal("")),
});
export type JoinInput = z.infer<typeof joinSchema>;
