import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { invoiceSchema, renderInvoicePdf } from "./invoice-pdf";

/** Génère le PDF d'une facture et l'enregistre dans le bucket privé « invoices ». */
export async function storeInvoicePdf(invoiceId: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("invoices")
    .select("id, client_id, number, issued_at, total_cents, currency, vat_mention, seller_snapshot, buyer_snapshot, lines, payment:payments(validated_at, reference)")
    .eq("id", invoiceId)
    .single();
  if (error || !row) throw new Error(`Facture introuvable : ${error?.message}`);

  const invoice = invoiceSchema.parse(row);
  const pdf = await renderInvoicePdf(invoice);
  const path = `${row.client_id}/${invoice.number}.pdf`;
  const upload = await admin.storage.from("invoices").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw new Error(`Enregistrement du PDF : ${upload.error.message}`);
  await admin.from("invoices").update({ pdf_path: path }).eq("id", invoiceId);
  return path;
}
