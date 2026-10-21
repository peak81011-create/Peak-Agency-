import { describe, expect, it } from "vitest";
import { parseDurationHours, ticketSchema } from "./support";

describe("service client", () => {
  it("convertit le délai de réponse en heures", () => {
    expect(parseDurationHours("24 h")).toBe(24);
    expect(parseDurationHours("48 heures ouvrées")).toBe(48);
    expect(parseDurationHours("2 jours")).toBe(48);
    expect(parseDurationHours("1 day")).toBe(24);
    expect(parseDurationHours("rapidement")).toBeNull();
    expect(parseDurationHours("")).toBeNull();
  });

  it("un ticket a une catégorie, un sujet et un message suffisant", () => {
    expect(ticketSchema.safeParse({ category: "paiement", subject: "Virement", message: "Bonjour, mon virement est parti hier." }).success).toBe(true);
    expect(ticketSchema.safeParse({ category: "inconnue", subject: "Virement", message: "Bonjour, mon virement…" }).success).toBe(false);
    expect(ticketSchema.safeParse({ category: "paiement", subject: "V", message: "court" }).success).toBe(false);
  });
});
