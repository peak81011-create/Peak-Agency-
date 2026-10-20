import { describe, expect, it } from "vitest";
import { renderInvoicePdf } from "./invoice-pdf";

describe("facture PDF", () => {
  it("produit un PDF à partir des instantanés", async () => {
    const pdf = await renderInvoicePdf({
      number: "F-2026-0001",
      issued_at: "2026-10-21T10:00:00Z",
      total_cents: 89000,
      currency: "EUR",
      vat_mention: "TVA non applicable, art. 293 B du CGI",
      seller_snapshot: { legal_name: "Peak", siret: "", address: "" },
      buyer_snapshot: { full_name: "Léa Martin", creator_name: "Léa Live", email: "lea@example.com" },
      lines: [
        { label_fr: "Offre Croissance", quantity: 1, unit_cents: 89000, total_cents: 89000, period_start: "2026-10-21", period_end: "2026-11-20" },
      ],
      payment: { validated_at: "2026-10-21T10:00:00Z", reference: "PEAK-2026-0001" },
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
