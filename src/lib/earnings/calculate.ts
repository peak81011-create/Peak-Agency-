// Calcul du gain d'un clip pour un clipper. UNE seule fonction, utilisée par le
// simulateur public, l'espace clipper et les relevés mensuels.

/** Règles appliquées à un clip (figées au moment de sa validation). Montants en centimes. */
export type EarningRules = {
  minimumCents: number;
  per1000ViewsCents: number;
  capCents: number | null;
  levelCoefficient: number;
};

/**
 * Gain d'un clip validé : minimum garanti + prime aux 1 000 vues, plafonné si un
 * plafond est fixé, puis multiplié par le coefficient du niveau. Sans relevé de
 * vues (views null), seul le minimum garanti est compté.
 */
export function calculerGainClip(rules: EarningRules, views: number | null): number {
  const counted = Math.max(0, Math.floor(views ?? 0));
  const raw = rules.minimumCents + (counted / 1000) * rules.per1000ViewsCents;
  const capped = rules.capCents !== null ? Math.min(raw, rules.capCents) : raw;
  return Math.round(capped * rules.levelCoefficient);
}
