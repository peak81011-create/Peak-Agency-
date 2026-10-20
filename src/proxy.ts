import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { refreshSession } from "@/lib/supabase/proxy-session";

const intl = createIntlMiddleware(routing);

// Espaces privés : la vérification fine (rôle, permissions, 2FA) est faite
// côté serveur dans les layouts ; ici on redirige seulement les visiteurs.
const PRIVATE_PREFIXES = ["/app", "/admin", "/account", "/mfa"];

export async function proxy(request: NextRequest) {
  const response = intl(request);
  const claims = await refreshSession(request, response);

  const [, maybeLocale, ...rest] = request.nextUrl.pathname.split("/");
  const locale = (routing.locales as readonly string[]).includes(maybeLocale) ? maybeLocale : routing.defaultLocale;
  const pathWithoutLocale = `/${rest.join("/")}`;
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`));

  if (isPrivate && !claims) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}

export const config = {
  // Tout sauf les routes API, les fichiers internes Next et les fichiers statiques.
  matcher: ["/((?!api|auth|_next|_vercel|brand|.*\\..*).*)"],
};
