import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { canWrite, isUnlocked } from "./status";

/** Pages de l'espace complet : réservées aux clients dont le paiement est validé. */
export async function requireUnlockedClient(): Promise<{ user: SessionUser; client: NonNullable<SessionUser["client"]>; writable: boolean }> {
  const user = await requireUser();
  const client = user.client;
  if (!client || !isUnlocked(client.status)) redirect({ href: "/app", locale: await getLocale() });
  return { user, client: client!, writable: canWrite(client!.status) };
}
