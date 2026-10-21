import { describe, expect, it } from "vitest";
import { joinSchema } from "./join";

const valid = {
  fullName: "Sam Clipper",
  email: "sam@example.com",
  portfolioUrl: "https://www.tiktok.com/@sam",
  platforms: ["tiktok"],
  experience: "intermediaire",
  tools: "CapCut, Premiere Pro",
  hoursPerWeek: "10_20",
  languages: "Français, anglais",
  message: "",
  website: "",
};

describe("candidature clipper", () => {
  it("accepte une candidature complète", () => {
    expect(joinSchema.safeParse(valid).success).toBe(true);
  });

  it("le portfolio est facultatif mais doit être un lien https", () => {
    expect(joinSchema.safeParse({ ...valid, portfolioUrl: "" }).success).toBe(true);
    expect(joinSchema.safeParse({ ...valid, portfolioUrl: "http://exemple.fr" }).success).toBe(false);
  });

  it("niveau et disponibilité obligatoires", () => {
    expect(joinSchema.safeParse({ ...valid, experience: "" }).success).toBe(false);
    expect(joinSchema.safeParse({ ...valid, hoursPerWeek: undefined }).success).toBe(false);
  });
});
