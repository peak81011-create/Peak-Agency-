import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { presignUpload, type SignableRequest } from "@/lib/storage/s3";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  method: z.enum(["PUT", "POST", "GET", "DELETE"]),
  key: z.string().min(1).max(600),
  uploadId: z.string().max(1000).optional(),
  partNumber: z.number().int().min(1).max(10_000).optional(),
  contentType: z.string().max(100).optional(),
});

// Signature des requêtes d'envoi (Uppy) : uniquement pour une clé préparée
// par le serveur pour cet utilisateur, non terminée et non expirée.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const body = parsed.data;

  const { data: pending } = await createSupabaseAdminClient()
    .from("pending_uploads")
    .select("id, mime")
    .eq("object_key", body.key)
    .eq("user_id", user.id)
    .is("completed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!pending) return new NextResponse(null, { status: 403 });

  let req: SignableRequest;
  if (body.method === "PUT" && body.uploadId && body.partNumber) {
    req = { method: "PUT", key: body.key, uploadId: body.uploadId, partNumber: body.partNumber };
  } else if (body.method === "PUT") {
    req = { method: "PUT", key: body.key, contentType: pending.mime };
  } else if (body.method === "POST") {
    req = { method: "POST", key: body.key, uploadId: body.uploadId };
  } else if (body.uploadId) {
    req = { method: body.method, key: body.key, uploadId: body.uploadId };
  } else {
    return new NextResponse(null, { status: 400 });
  }
  return NextResponse.json(await presignUpload(req));
}
