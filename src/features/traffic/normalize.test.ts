import { describe, expect, it } from "vitest";
import { isBot, normalizePath } from "./normalize";

describe("statistiques de visite", () => {
  it("regroupe les pages par chemin, sans identifiant ni paramètre", () => {
    expect(normalizePath("/fr/tarifs/croissance?x=1")).toBe("/fr/tarifs/croissance");
    expect(normalizePath("/fr/app/clips/123e4567-e89b-12d3-a456-426614174000")).toBe("/fr/app/clips/:id");
    expect(normalizePath("/fr/")).toBe("/fr");
    expect(normalizePath("https://autre.site/x")).toBeNull();
  });

  it("ignore les robots", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1")).toBe(false);
  });
});
