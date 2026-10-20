import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storeInvoicePdf } from "@/lib/invoices/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Téléchargement d'une facture : la lecture passe par la session de
// l'utilisateur (RLS : ses factures, ou la permission d'en voir), puis une
// URL signée de courte durée est créée.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data: invoice } = await supabase.from("invoices").select("id, pdf_path").eq("id", id).maybeSingle();
  if (!invoice) return new NextResponse(null, { status: 404 });

  // PDF manquant (ex. échec ponctuel lors de la validation) : on le régénère.
  const path = invoice.pdf_path ?? (await storeInvoicePdf(invoice.id));
  const { data } = await createSupabaseAdminClient().storage.from("invoices").createSignedUrl(path, 60, { download: true });
  if (!data) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
