import { describe, expect, it } from "vitest";
import { loginSchema, passwordSchema, signupSchema } from "./auth";

describe("schémas d'authentification", () => {
  it("impose 12 caractères, un chiffre et un symbole", () => {
    expect(passwordSchema.safeParse("court1!").success).toBe(false);
    expect(passwordSchema.safeParse("sanschiffre!!!").success).toBe(false);
    expect(passwordSchema.safeParse("sanssymbole123").success).toBe(false);
    expect(passwordSchema.safeParse("Peak-Agency-2026").success).toBe(true);
  });

  it("refuse une inscription sans acceptation des CGV", () => {
    const res = signupSchema.safeParse({
      fullName: "Léa",
      creatorName: "Léa Live",
      email: "lea@example.com",
      password: "Peak-Agency-2026",
      acceptTerms: false,
    });
    expect(res.success).toBe(false);
  });

  it("valide une connexion simple", () => {
    expect(loginSchema.safeParse({ email: "a@b.fr", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "pas-un-email", password: "x" }).success).toBe(false);
  });
});
