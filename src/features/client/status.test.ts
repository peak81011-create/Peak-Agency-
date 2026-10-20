import { describe, expect, it } from "vitest";
import { canWrite, isUnlocked, nextOnboardingStep } from "./status";

const client = (over: Partial<Parameters<typeof nextOnboardingStep>[0]>) => ({
  id: "c",
  status: "inscrit" as const,
  creatorName: "",
  planId: null,
  profileCompleted: false,
  ...over,
});

describe("parcours client", () => {
  it("enchaîne profil → offre → paiement", () => {
    expect(nextOnboardingStep(client({}))).toBe("profile");
    expect(nextOnboardingStep(client({ profileCompleted: true }))).toBe("plan");
    expect(nextOnboardingStep(client({ profileCompleted: true, planId: "p", status: "attente_paiement" }))).toBe("payment");
    expect(nextOnboardingStep(client({ profileCompleted: true, planId: "p", status: "paiement_a_verifier" }))).toBe("payment");
    expect(nextOnboardingStep(client({ profileCompleted: true, planId: "p", status: "actif" }))).toBeNull();
  });

  it("verrouille tant que le paiement n'est pas validé, lecture seule ensuite", () => {
    expect(isUnlocked("paiement_a_verifier")).toBe(false);
    expect(isUnlocked("suspendu")).toBe(false);
    expect(isUnlocked("lecture_seule")).toBe(true);
    expect(canWrite("lecture_seule")).toBe(false);
    expect(canWrite("grace")).toBe(true);
  });
});
