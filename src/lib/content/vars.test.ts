import { describe, expect, it } from "vitest";
import { fillVars, usedVars } from "./vars";

describe("variables des textes", () => {
  it("remplace les variables renseignées", () => {
    expect(fillVars("On vous répond sous {delai_reponse}.", { delai_reponse: "24 h" })).toBe("On vous répond sous 24 h.");
  });

  it("masque le texte si une variable est vide ou absente", () => {
    expect(fillVars("Sous {delai_reponse}.", { delai_reponse: "" })).toBeNull();
    expect(fillVars("Minimum {minimum_par_clip}.", {})).toBeNull();
  });

  it("un texte sans variable est affiché tel quel", () => {
    expect(fillVars("Bonjour", {})).toBe("Bonjour");
    expect(usedVars("{a} et {b_1}")).toEqual(["a", "b_1"]);
  });
});
