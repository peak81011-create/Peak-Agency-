import "server-only";
import type { Permission } from "./permission-catalog";
import { can, getSessionUser, type SessionUser } from "./session";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Server actions : vérifie la permission côté serveur avant toute écriture. */
export async function authorize(
  permission: Permission,
  resource?: { clientId: string },
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: "unauthenticated" | "forbidden" }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (!(await can(user, permission, resource))) return { ok: false, error: "forbidden" };
  return { ok: true, user };
}
