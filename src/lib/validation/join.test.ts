import { describe, expect, it } from "vitest";
import { joinSchema } from "./join";

const valid = {
  nickname: "samcuts",
  firstName: "Sam",
  email: "sam@example.com",
  ageConfirmed: true,
  country: "France",
  languages: "Français, anglais",
  portfolioLinks: ["https://www.tiktok.com/@samcuts", "", "", "", ""],
  software: "CapCut",
  experience: "intermediaire",
  hoursPerWeek: "10_20",
  motivation: "",
  privacyAccepted: true,
  website: "",
};

describe("candidature clipper", () => {
  it("accepte une candidature complète", () => {
    expect(joinSchema.safeParse(valid).success).toBe(true);
  });

  it("au moins un exemple de montage, en lien https", () => {
    expect(joinSchema.safeParse({ ...valid, portfolioLinks: ["", ""] }).success).toBe(false);
    expect(joinSchema.safeParse({ ...valid, portfolioLinks: ["http://exemple.fr"] }).success).toBe(false);
  });

  it("âge minimum et confidentialité obligatoires", () => {
    expect(joinSchema.safeParse({ ...valid, ageConfirmed: false }).success).toBe(false);
    expect(joinSchema.safeParse({ ...valid, privacyAccepted: false }).success).toBe(false);
  });

  it("niveau et disponibilité obligatoires", () => {
    expect(joinSchema.safeParse({ ...valid, experience: "" }).success).toBe(false);
    expect(joinSchema.safeParse({ ...valid, hoursPerWeek: undefined }).success).toBe(false);
  });
});
