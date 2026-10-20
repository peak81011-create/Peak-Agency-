import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AppShell } from "@/features/shell/app-shell";
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
  return <AppShell user={user}>{children}</AppShell>;
}
