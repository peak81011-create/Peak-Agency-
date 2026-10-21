import { describe, expect, it } from "vitest";
import { searchFaq } from "./search";

const items = [
  { question: "Comment je paie ?", answer: "Par virement bancaire, avec une référence." },
  { question: "Mes vidéos restent-elles à moi ?", answer: "Oui, vos contenus vous appartiennent." },
  { question: "Quand suis-je payé ?", answer: "Chaque mois, par virement." },
];

describe("recherche dans la FAQ", () => {
  it("trouve les réponses liées à un mot-clé, sans tenir compte des accents", () => {
    expect(searchFaq(items, "virement").map((i) => i.question)).toEqual(["Comment je paie ?", "Quand suis-je payé ?"]);
    expect(searchFaq(items, "VIDEOS")[0].question).toBe("Mes vidéos restent-elles à moi ?");
  });

  it("une recherche vide ne renvoie rien", () => {
    expect(searchFaq(items, "  ")).toEqual([]);
    expect(searchFaq(items, "le la")).toEqual([]);
  });
});
