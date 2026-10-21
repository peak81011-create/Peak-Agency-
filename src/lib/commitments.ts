import "server-only";
import type { Locale } from "@/i18n/routing";
import type { EarningRules } from "@/lib/earnings/calculate";
import { formatMoney } from "@/lib/format";
import { type Settings, getSettings } from "@/lib/settings";

// Textes & engagements (Admin → Paramètres). Une seule source de vérité pour
// les textes publics et le calcul réel des gains des clippers.

export type Commitments = Settings<"commitments">;

export const COMMITMENT_KEYS = [
  "delai_reponse",
  "delai_activation",
  "delai_premiers_clips",
  "conditions_resiliation",
  "minimum_par_clip",
  "tarif_1000_vues",
  "jours_comptage_vues",
  "plafond_par_clip",
  "jour_paiement",
  "clip_test_remunere",
  "age_minimum",
] as const;

/** Facultatives : ne figurent pas dans la checklist de mise en ligne. */
const OPTIONAL: readonly string[] = ["plafond_par_clip"];

export function getCommitments(): Promise<Commitments> {
  return getSettings("commitments");
}

/** Valeurs prêtes à afficher (montants formatés) ; "" si non renseignée. */
export function commitmentVars(c: Commitments, locale: Locale): Record<string, string> {
  const money = (v: number | null) => (v === null ? "" : formatMoney(v, "EUR", locale));
  const num = (v: number | null) => (v === null ? "" : String(v));
  return {
    delai_reponse: c.delai_reponse,
    delai_activation: c.delai_activation,
    delai_premiers_clips: c.delai_premiers_clips,
    conditions_resiliation: c.conditions_resiliation,
    minimum_par_clip: money(c.minimum_par_clip),
    tarif_1000_vues: money(c.tarif_1000_vues),
    jours_comptage_vues: num(c.jours_comptage_vues),
    plafond_par_clip: money(c.plafond_par_clip),
    jour_paiement: num(c.jour_paiement),
    clip_test_remunere: c.clip_test_remunere,
    age_minimum: String(c.age_minimum),
  };
}

/** Variables à compléter avant la mise en ligne. */
export function missingCommitments(c: Commitments): string[] {
  const vars = commitmentVars(c, "fr");
  return COMMITMENT_KEYS.filter((k) => !OPTIONAL.includes(k) && !vars[k]);
}

/** Règles de rémunération en vigueur, ou null tant qu'elles ne sont pas toutes renseignées. */
export function currentEarningRules(c: Commitments, levelCoefficient = 1): EarningRules | null {
  if (c.minimum_par_clip === null || c.tarif_1000_vues === null || c.jours_comptage_vues === null) return null;
  return { minimumCents: c.minimum_par_clip, per1000ViewsCents: c.tarif_1000_vues, capCents: c.plafond_par_clip, levelCoefficient };
}
