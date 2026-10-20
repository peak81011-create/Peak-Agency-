import type { ClientStatus, SessionUser } from "@/lib/auth/session";

/** Statuts où l'espace complet est ouvert (en lecture seule pour le dernier). */
export const UNLOCKED_STATUSES: readonly ClientStatus[] = ["actif", "grace", "lecture_seule"];

export function isUnlocked(status: ClientStatus): boolean {
  return UNLOCKED_STATUSES.includes(status);
}

/** Le client peut-il envoyer des vidéos et faire des demandes ? */
export function canWrite(status: ClientStatus): boolean {
  return status === "actif" || status === "grace";
}

export type OnboardingStep = "profile" | "plan" | "payment";

/** Étape d'accueil à compléter, ou null si le parcours est terminé. */
export function nextOnboardingStep(client: NonNullable<SessionUser["client"]>): OnboardingStep | null {
  if (isUnlocked(client.status)) return null;
  if (!client.profileCompleted) return "profile";
  if (!client.planId || client.status === "inscrit") return "plan";
  return "payment";
}

export const STEP_PATHS: Record<OnboardingStep, "/app/profile" | "/app/plan" | "/app/payment"> = {
  profile: "/app/profile",
  plan: "/app/plan",
  payment: "/app/payment",
};
