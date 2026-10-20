import { describe, expect, it } from "vitest";
import { isValidIban, settingsFormSchemas } from "./settings";

describe("paramètres", () => {
  it("vérifie la clé de l'IBAN", () => {
    expect(isValidIban("FR76 3000 6000 0112 3456 7890 189")).toBe(true);
    expect(isValidIban("FR76 3000 6000 0112 3456 7890 188")).toBe(false);
    expect(isValidIban("pas un iban")).toBe(false);
  });

  it("accepte des champs légaux vides (rien n'est supposé)", () => {
    const empty = Object.fromEntries(Object.keys(settingsFormSchemas.company.shape).map((k) => [k, ""]));
    expect(settingsFormSchemas.company.safeParse(empty).success).toBe(true);
  });

  it("refuse un SIRET mal formé", () => {
    const company = Object.fromEntries(Object.keys(settingsFormSchemas.company.shape).map((k) => [k, ""]));
    expect(settingsFormSchemas.company.safeParse({ ...company, siret: "123" }).success).toBe(false);
    expect(settingsFormSchemas.company.safeParse({ ...company, siret: "123 456 789 00012" }).success).toBe(true);
  });
});
