/** Trace côté serveur d'une erreur technique (jamais montrée telle quelle à l'utilisateur). */
export function logError(context: string, error: unknown): void {
  if (error) console.error(`[${context}]`, error instanceof Error ? error.message : JSON.stringify(error));
}
