import { describe, expect, it } from "vitest";
import { formatIban, formatMoney, parseEurosToCents } from "./format";

describe("formats", () => {
  it("affiche les montants selon la langue", () => {
    expect(formatMoney(89000, "EUR", "fr").replace(/\s/g, " ")).toBe("890,00 €");
    expect(formatMoney(89000, "EUR", "en")).toBe("€890.00");
  });

  it("découpe l'IBAN par blocs de 4", () => {
    expect(formatIban("fr7630006000011234567890189")).toBe("FR76 3000 6000 0112 3456 7890 189");
  });

  it("convertit des euros saisis en centimes", () => {
    expect(parseEurosToCents("890")).toBe(89000);
    expect(parseEurosToCents("890,5")).toBe(89050);
    expect(parseEurosToCents(" 1 490.99 ")).toBe(149099);
    expect(parseEurosToCents("abc")).toBeNull();
    expect(parseEurosToCents("-5")).toBeNull();
  });
});
