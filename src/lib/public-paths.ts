import type { Locale } from "@/i18n/routing";

// Adresses publiques traduites : /fr/createurs ↔ /en/creators, etc.
// Les pages existent sous leur nom anglais ; next.config.ts réécrit les
// adresses françaises vers elles.
export const FR_PATHS = {
  "/creators": "/createurs",
  "/pricing": "/tarifs",
  "/clippers/apply": "/clippers/postuler",
  "/help": "/aide",
} as const;

/** Adresse affichée pour une page publique, dans la langue donnée. */
export function localizedPath(path: string, locale: Locale): string {
  if (locale !== "fr") return path;
  const [base, hash] = path.split("#");
  const fr = (FR_PATHS as Record<string, string>)[base] ?? base;
  return hash ? `${fr}#${hash}` : fr;
}

/** Page détaillée d'une offre (/fr/tarifs/croissance, /en/pricing/growth…). */
export function offerPath(slug: string, locale: Locale): string {
  return `${localizedPath("/pricing", locale)}/${slug}`;
}
