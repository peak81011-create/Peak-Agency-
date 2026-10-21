/** Chemin regroupé pour les statistiques (identifiants remplacés, longueur bornée). */
export function normalizePath(path: string): string | null {
  if (!path.startsWith("/") || path.length > 300) return null;
  const clean = path
    .split("?")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/+$/, "");
  return clean || "/";
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

export function isBot(userAgent: string): boolean {
  return !userAgent || BOT.test(userAgent);
}
