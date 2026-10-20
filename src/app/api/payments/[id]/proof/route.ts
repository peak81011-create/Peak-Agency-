import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Aperçu d'une preuve de virement : visible par le client concerné et par les
// personnes autorisées (RLS sur payments), via une URL signée de 5 minutes.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data: payment } = await supabase.from("payments").select("proof_path").eq("id", id).maybeSingle();
  if (!payment?.proof_path) return new NextResponse(null, { status: 404 });

  const download = request.nextUrl.searchParams.has("download");
  const { data } = await createSupabaseAdminClient()
    .storage.from("payment-proofs")
    .createSignedUrl(payment.proof_path, 300, download ? { download: true } : undefined);
  if (!data) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
