/** Heure courante en millisecondes (rendu serveur, calculé à chaque requête). */
export function nowMs(): number {
  return Date.now();
}
