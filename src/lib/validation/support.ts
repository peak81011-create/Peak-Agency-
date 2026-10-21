import { z } from "zod";

export const TICKET_STATUSES = ["ouvert", "en_cours", "attente_utilisateur", "resolu"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketAudience = "createur" | "clipper" | "equipe";

/** Public d'un ticket selon le rôle de son auteur. */
export function audienceOf(user: { role: string }): TicketAudience {
  return user.role === "client" ? "createur" : user.role === "clipper" ? "clipper" : "equipe";
}

/** Catégories proposées selon le public. */
export const TICKET_CATEGORIES: Record<TicketAudience, readonly string[]> = {
  createur: ["paiement", "clips", "comptes", "demande", "compte", "autre"],
  clipper: ["mission", "remuneration", "paiement", "compte", "autre"],
  equipe: ["compte", "autre"],
};
export const ALL_TICKET_CATEGORIES = ["paiement", "clips", "comptes", "demande", "compte", "mission", "remuneration", "autre"] as const;

export const ticketSchema = z.object({
  category: z.enum(ALL_TICKET_CATEGORIES, { message: "required" }),
  subject: z.string().trim().min(3, { message: "required" }).max(200, { message: "tooLong" }),
  message: z.string().trim().min(10, { message: "messageTooShort" }).max(5000, { message: "tooLong" }),
});
export type TicketInput = z.infer<typeof ticketSchema>;

export const ticketReplySchema = z.string().trim().min(1, { message: "required" }).max(5000, { message: "tooLong" });

export const savedReplySchema = z.object({
  title: z.string().trim().min(1, { message: "required" }).max(120, { message: "tooLong" }),
  bodyFr: z.string().trim().max(5000, { message: "tooLong" }),
  bodyEn: z.string().trim().max(5000, { message: "tooLong" }),
});
export type SavedReplyInput = z.infer<typeof savedReplySchema>;

/**
 * Délai de réponse saisi par l'admin (« 24 h », « 2 jours », « 48 heures
 * ouvrées ») converti en heures, pour signaler les tickets en retard. null si
 * le texte ne contient pas de durée reconnaissable.
 */
export function parseDurationHours(text: string): number | null {
  const m = text.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(h|heures?|hours?|j|jours?|days?|d)\b/);
  if (!m) return null;
  const value = Number(m[1].replace(",", "."));
  return /^(j|jours?|days?|d)$/.test(m[2]) ? value * 24 : value;
}
