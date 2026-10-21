import type { FaqEntry } from "./queries";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");

const STOP = new Set(["le", "la", "les", "de", "des", "du", "un", "une", "et", "ou", "je", "tu", "mon", "ma", "mes", "est", "a", "the", "is", "my", "i", "to", "of", "and", "how", "do", "comment", "quoi", "que", "qui"]);

/** Recherche simple par mots-clés (accents ignorés), meilleures réponses d'abord. */
export function searchFaq<T extends Pick<FaqEntry, "question" | "answer">>(items: T[], query: string, limit = 50): T[] {
  const words = normalize(query)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
  if (!words.length) return [];
  return items
    .map((item) => {
      const q = normalize(item.question);
      const a = normalize(item.answer);
      const score = words.reduce((acc, w) => acc + (q.includes(w) ? 3 : 0) + (a.includes(w) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.item);
}
