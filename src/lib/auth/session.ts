import "server-only";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPermission, type Permission, type Role } from "./permission-catalog";

export type ClientStatus =
  | "inscrit"
  | "attente_paiement"
  | "paiement_a_verifier"
  | "actif"
  | "grace"
  | "lecture_seule"
  | "suspendu"
  | "archive";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  locale: "fr" | "en";
  isActive: boolean;
  /** Niveau d'authentification de la session (aal2 = double authentification validée). */
  aal: "aal1" | "aal2";
  /** Permissions effectives calculées par la base (même règle que la RLS). */
  permissions: ReadonlySet<Permission>;
  client: { id: string; status: ClientStatus; creatorName: string } | null;
};

/** Utilisateur connecté, lu une seule fois par requête. Null si non connecté. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const [{ data: profile }, { data: perms }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, locale, is_active").eq("id", claims.sub).single(),
    supabase.rpc("my_permissions"),
  ]);
  if (!profile) return null;

  let client: SessionUser["client"] = null;
  if (profile.role === "client") {
    const { data } = await supabase
      .from("clients")
      .select("id, status, creator_name")
      .eq("profile_id", profile.id)
      .single();
    if (data) client = { id: data.id, status: data.status as ClientStatus, creatorName: data.creator_name };
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as Role,
    locale: profile.locale === "en" ? "en" : "fr",
    isActive: profile.is_active,
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
    permissions: new Set(((perms as string[] | null) ?? []).filter(isPermission)),
    client,
  };
});

/**
 * Fonction d'autorisation unique, utilisée par les pages, les server actions
 * et l'affichage conditionnel. Avec une ressource client, vérifie aussi
 * l'attribution (via la même fonction SQL que la RLS).
 */
export async function can(
  user: SessionUser | null,
  permission: Permission,
  resource?: { clientId: string },
): Promise<boolean> {
  if (!user || !user.isActive || !user.permissions.has(permission)) return false;
  if (!resource) return true;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("can_see_client", { p_client_id: resource.clientId });
  return data === true;
}

/** Pages : redirige vers la connexion si aucun utilisateur. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect({ href: "/login", locale: await getLocale() });
  }
  return user as SessionUser;
}

/** Pages : exige une permission, sinon page « accès refusé ». */
export async function requirePermission(permission: Permission, resource?: { clientId: string }): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await can(user, permission, resource))) {
    redirect({ href: "/forbidden", locale: await getLocale() });
  }
  return user;
}

export function isStaff(user: SessionUser): boolean {
  return user.role !== "client";
}

/** Page d'accueil de l'espace privé selon le rôle. */
export function homePathFor(user: Pick<SessionUser, "role">): "/app" | "/admin" {
  return user.role === "client" ? "/app" : "/admin";
}
