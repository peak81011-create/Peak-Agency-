import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";

// Facture PDF (en français : langue légale de facturation, libellés anglais en
// complément). Les données viennent uniquement des instantanés figés en base.

export const invoiceSchema = z.object({
  number: z.string(),
  issued_at: z.string(),
  total_cents: z.number(),
  currency: z.string(),
  vat_mention: z.string(),
  seller_snapshot: z.record(z.string(), z.unknown()),
  buyer_snapshot: z.record(z.string(), z.unknown()),
  lines: z.array(
    z.object({
      label_fr: z.string(),
      label_en: z.string().optional(),
      quantity: z.number(),
      unit_cents: z.number(),
      total_cents: z.number(),
      period_start: z.string().nullable().optional(),
      period_end: z.string().nullable().optional(),
      reference: z.string().optional(),
    }),
  ),
  payment: z.object({ validated_at: z.string().nullable(), reference: z.string() }),
});
export type InvoiceData = z.infer<typeof invoiceSchema>;

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100).replace(/ | /g, " ");
const date = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)) : "—";
const s = (v: unknown) => (typeof v === "string" ? v : "");

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#19261f" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: "#5c685f" },
  block: { marginTop: 24 },
  label: { fontSize: 8, color: "#5c685f", textTransform: "uppercase", marginBottom: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 24, borderTop: "1 solid #dce2d5" },
  th: { flexDirection: "row", borderBottom: "1 solid #dce2d5", paddingVertical: 6, color: "#5c685f", fontSize: 8 },
  tr: { flexDirection: "row", borderBottom: "1 solid #ebefe6", paddingVertical: 8 },
  c1: { flex: 4 },
  c2: { flex: 1, textAlign: "right" },
  c3: { flex: 2, textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  footer: { position: "absolute", bottom: 32, left: 40, right: 40, fontSize: 8, color: "#5c685f" },
});

export function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  const seller = invoice.seller_snapshot;
  const buyer = invoice.buyer_snapshot;
  const sellerName = s(seller.legal_name) || s(seller.trade_name);
  return (
    <Document title={`Facture ${invoice.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.row}>
          <View>
            <Text style={styles.h1}>Facture / Invoice</Text>
            <Text style={styles.muted}>N° {invoice.number}</Text>
            <Text style={styles.muted}>Date d’émission : {date(invoice.issued_at)}</Text>
          </View>
          <View style={{ maxWidth: 220 }}>
            <Text style={styles.bold}>{sellerName}</Text>
            {s(seller.legal_form) ? <Text>{s(seller.legal_form)}</Text> : null}
            {s(seller.address) ? <Text>{s(seller.address)}</Text> : null}
            {s(seller.siret) ? <Text>SIRET : {s(seller.siret)}</Text> : null}
            {s(seller.vat_number) ? <Text>TVA : {s(seller.vat_number)}</Text> : null}
            {s(seller.email) ? <Text>{s(seller.email)}</Text> : null}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Client / Bill to</Text>
          <Text style={styles.bold}>{s(buyer.full_name) || s(buyer.creator_name)}</Text>
          {s(buyer.creator_name) && s(buyer.full_name) ? <Text>{s(buyer.creator_name)}</Text> : null}
          {s(buyer.billing_address) ? <Text>{s(buyer.billing_address)}</Text> : null}
          {s(buyer.email) ? <Text>{s(buyer.email)}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.c1}>Désignation</Text>
            <Text style={styles.c2}>Qté</Text>
            <Text style={styles.c3}>Prix unitaire</Text>
            <Text style={styles.c3}>Total</Text>
          </View>
          {invoice.lines.map((line, i) => (
            <View key={i} style={styles.tr}>
              <View style={styles.c1}>
                <Text>{line.label_fr}</Text>
                {line.period_start ? (
                  <Text style={styles.muted}>
                    Période du {date(line.period_start)}
                    {line.period_end ? ` au ${date(line.period_end)}` : ""}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.c2}>{line.quantity}</Text>
              <Text style={styles.c3}>{money(line.unit_cents, invoice.currency)}</Text>
              <Text style={styles.c3}>{money(line.total_cents, invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.row}>
            <Text style={styles.bold}>Total</Text>
            <Text style={styles.bold}>{money(invoice.total_cents, invoice.currency)}</Text>
          </View>
          {invoice.vat_mention ? <Text style={[styles.muted, { marginTop: 6 }]}>{invoice.vat_mention}</Text> : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Règlement / Payment</Text>
          <Text>
            Payée par virement bancaire le {date(invoice.payment.validated_at)} — référence {invoice.payment.reference}
          </Text>
        </View>

        <Text style={styles.footer} fixed>
          {[sellerName, s(seller.legal_form), s(seller.siret) && `SIRET ${s(seller.siret)}`, s(seller.address)]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
