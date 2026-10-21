import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isBot, normalizePath } from "@/features/traffic/normalize";
import { clientIp } from "@/lib/security/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const body = z.object({ path: z.string().max(300), referrer: z.string().max(120).optional() });

/**
 * Page vue. Le visiteur est compté grâce à une empreinte qui change chaque jour
 * (adresse IP + navigateur + date + secret, hachés) : rien n'est stocké qui
 * permette de le reconnaître ou de le suivre d'un jour à l'autre.
 */
export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return new NextResponse(null, { status: 204 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  const path = parsed.success ? normalizePath(parsed.data.path) : null;
  if (!path) return new NextResponse(null, { status: 204 });

  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_SALT || process.env.SUPABASE_SECRET_KEY || "peak";
  const visitor = createHash("sha256").update(`${await clientIp()}|${ua}|${day}|${salt}`).digest("hex").slice(0, 32);
  const referrer = parsed.success && parsed.data.referrer && /^[a-z0-9.-]+$/i.test(parsed.data.referrer) ? parsed.data.referrer : null;

  await createSupabaseAdminClient().rpc("track_page_view", { p_path: path, p_visitor_hash: visitor, p_referrer_host: referrer });
  return new NextResponse(null, { status: 204 });
}
