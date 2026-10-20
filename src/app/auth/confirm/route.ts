import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: readonly EmailOtpType[] = ["email", "signup", "recovery", "invite", "email_change"];

/** N'accepte qu'un chemin interne (/fr/... ou /en/...) pour éviter les redirections ouvertes. */
function safeNext(next: string | null): string {
  return next && /^\/(fr|en)(\/[A-Za-z0-9\-/]*)?$/.test(next) ? next : "/fr/app";
}

// Lien reçu par e-mail : vérifie le token côté serveur puis ouvre la session.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));
  const locale = next.startsWith("/en") ? "en" : "fr";

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL(`/${locale}/login?error=link`, request.url));
}
