import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("traductions", () => {
  it("le français et l'anglais ont exactement les mêmes clés", () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it("aucune traduction n'est vide", () => {
    for (const messages of [fr, en]) {
      for (const key of keys(messages)) {
        const value = key.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], messages);
        expect(String(value).trim(), key).not.toBe("");
      }
    }
  });
});
