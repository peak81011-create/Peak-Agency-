import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { presignDownload } from "@/lib/storage/s3";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Fichier d'un clip (lecture dans le lecteur avec ?inline, sinon téléchargement).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data: clip } = await supabase.from("clips").select("storage_key, file_name").eq("id", id).maybeSingle();
  if (!clip?.storage_key) return new NextResponse(null, { status: 404 });
  const inline = request.nextUrl.searchParams.has("inline");
  return NextResponse.redirect(await presignDownload(clip.storage_key, clip.file_name ?? undefined, inline));
}
