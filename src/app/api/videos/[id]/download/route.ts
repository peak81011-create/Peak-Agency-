import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { presignDownload } from "@/lib/storage/s3";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Téléchargement de la vidéo originale : la lecture de la fiche passe par la
// session (RLS : son propre espace, ou un client attribué), puis lien signé 15 min.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data: video } = await supabase
    .from("source_videos")
    .select("storage_key, file_name, status")
    .eq("id", id)
    .maybeSingle();
  if (!video?.storage_key || video.status === "envoi") return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(await presignDownload(video.storage_key, video.file_name ?? undefined));
}
