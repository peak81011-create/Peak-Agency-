import { describe, expect, it } from "vitest";
import { calculerGainClip, type EarningRules } from "./calculate";

const rules: EarningRules = { minimumCents: 300, per1000ViewsCents: 50, capCents: null, levelCoefficient: 1 };

describe("calculerGainClip", () => {
  it("sans vues : le minimum garanti", () => {
    expect(calculerGainClip(rules, 0)).toBe(300);
  });

  it("sans relevé de vues : le minimum garanti", () => {
    expect(calculerGainClip(rules, null)).toBe(300);
  });

  it("minimum + prime aux 1 000 vues", () => {
    expect(calculerGainClip(rules, 20_000)).toBe(300 + 20 * 50);
    expect(calculerGainClip(rules, 1_500)).toBe(375);
  });

  it("plafonné quand un plafond est fixé", () => {
    expect(calculerGainClip({ ...rules, capCents: 2_000 }, 1_000_000)).toBe(2_000);
    expect(calculerGainClip({ ...rules, capCents: 2_000 }, 1_000)).toBe(350);
  });

  it("coefficient de niveau appliqué après le plafond", () => {
    expect(calculerGainClip({ ...rules, levelCoefficient: 1.2 }, 10_000)).toBe(960);
    expect(calculerGainClip({ ...rules, capCents: 1_000, levelCoefficient: 1.5 }, 1_000_000)).toBe(1_500);
  });

  it("valeurs négatives ou décimales de vues neutralisées", () => {
    expect(calculerGainClip(rules, -50)).toBe(300);
    expect(calculerGainClip(rules, 999.9)).toBe(300 + Math.round(0.999 * 50));
  });
});
