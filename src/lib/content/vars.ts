// Variables {nom} dans les textes du site (« On vous répond sous {delai_reponse} »).
// Règle d'honnêteté : si une variable utilisée n'est pas renseignée, le texte
// n'est pas affiché (null), jamais affiché vide ou avec une valeur inventée.

export type Vars = Record<string, string>;

const VAR = /\{([a-z0-9_]+)\}/g;

/** Noms des variables utilisées dans un texte. */
export function usedVars(text: string): string[] {
  return [...text.matchAll(VAR)].map((m) => m[1]);
}

/** Texte avec les variables remplacées, ou null si l'une d'elles est vide. */
export function fillVars(text: string, vars: Vars): string | null {
  if (usedVars(text).some((name) => !vars[name])) return null;
  return text.replace(VAR, (_, name: string) => vars[name]);
}
