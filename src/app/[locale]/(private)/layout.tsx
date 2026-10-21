import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { HelpWidget } from "@/features/faq/help-widget";
import { getFaq } from "@/features/faq/queries";
import { AppShell } from "@/features/shell/app-shell";
import type { Locale } from "@/i18n/routing";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { touchLastSeen } from "@/lib/auth/presence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const locale = await getLocale();

  // Double authentification : obligatoire pour l'owner, et exigée pour tout
  // utilisateur qui l'a activée.
  const supabase = await createSupabaseServerClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const verified = aal?.currentLevel === "aal2";
  if (!verified && (user.role === "owner" || aal?.nextLevel === "aal2")) {
    redirect({ href: "/mfa", locale });
  }

  await touchLastSeen(user.id);
  const faq = await getFaq(locale as Locale);
  return (
    <AppShell user={user}>
      {children}
      <HelpWidget items={faq} audience={user.role === "clipper" ? "clipper" : "createur"} />
    </AppShell>
  );
}
