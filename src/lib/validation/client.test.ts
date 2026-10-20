import { describe, expect, it } from "vitest";
import { creatorProfileSchema, proofUploadSchema, safeFileName } from "./client";

const base = {
  creatorName: "Léa Live",
  niche: "gaming",
  language: "fr",
  channels: { youtube: "", twitch: "https://www.twitch.tv/lea", tiktok: "", instagram: "", kick: "", other: "" },
  goals: "",
  liveAvailability: "",
  billingAddress: "",
};

describe("profil créateur", () => {
  it("exige au moins une chaîne", () => {
    expect(creatorProfileSchema.safeParse(base).success).toBe(true);
    const none = { ...base, channels: { ...base.channels, twitch: "" } };
    expect(creatorProfileSchema.safeParse(none).success).toBe(false);
  });

  it("refuse les liens qui ne sont pas des adresses web", () => {
    const bad = { ...base, channels: { ...base.channels, youtube: "javascript:alert(1)" } };
    expect(creatorProfileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("preuve de virement", () => {
  const ok = { paymentId: "6f1c2b8e-4f7d-4a7e-9a35-2c1d3e4f5a6b", fileName: "virement.png", mimeType: "image/png", size: 1000 };
  it("accepte image ou PDF de 10 Mo maximum", () => {
    expect(proofUploadSchema.safeParse(ok).success).toBe(true);
    expect(proofUploadSchema.safeParse({ ...ok, mimeType: "application/zip" }).success).toBe(false);
    expect(proofUploadSchema.safeParse({ ...ok, size: 10 * 1024 * 1024 + 1 }).success).toBe(false);
  });

  it("nettoie le nom de fichier", () => {
    expect(safeFileName("Capture d’écran 2026.PNG")).toBe("Capture-d-ecran-2026.png");
    expect(safeFileName("../../etc/passwd")).not.toMatch(/[/\\]|\.\./);
  });
});
