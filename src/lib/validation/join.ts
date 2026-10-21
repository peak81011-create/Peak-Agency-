import { z } from "zod";

export const EXPERIENCE_LEVELS = ["debutant", "intermediaire", "avance"] as const;
export const HOURS_PER_WEEK = ["moins_10", "10_20", "20_35", "plus_35"] as const;
export const APPLICATION_STATUSES = ["recue", "test_envoye", "test_recu", "acceptee", "refusee"] as const;
export const MAX_PORTFOLIO_LINKS = 5;

const text = (max: number) => z.string().trim().min(1, { message: "required" }).max(max, { message: "tooLong" });
const link = z.string().trim().max(300, { message: "tooLong" }).refine((v) => v === "" || /^https:\/\/[^\s]+\.[^\s]+$/i.test(v), { message: "url" });

/** Candidature d'un clipper (page publique « Postuler »). */
export const joinSchema = z.object({
  nickname: text(60),
  firstName: text(80),
  email: z.email({ message: "email" }).max(254, { message: "tooLong" }),
  ageConfirmed: z.literal(true, { message: "ageRequired" }),
  country: text(80),
  languages: text(200),
  portfolioLinks: z
    .array(link)
    .max(MAX_PORTFOLIO_LINKS)
    .refine((links) => links.some((l) => l !== ""), { message: "portfolioRequired" }),
  software: text(200),
  experience: z.enum(EXPERIENCE_LEVELS, { message: "required" }),
  hoursPerWeek: z.enum(HOURS_PER_WEEK, { message: "required" }),
  motivation: z.string().trim().max(3000, { message: "tooLong" }),
  privacyAccepted: z.literal(true, { message: "privacyRequired" }),
  // Champ piège invisible : un humain le laisse vide.
  website: z.string().max(0).optional().or(z.literal("")),
});
export type JoinInput = z.input<typeof joinSchema>;
