import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { publicEnv } from "@/lib/env";
import { EmailLayout } from "@/lib/email/layout";
import { formatDate, formatMoney } from "@/lib/format";
import { sendEmail } from "@/lib/email/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Événements notifiés (cloche dans l'application + e-mail dans la langue de
// chaque destinataire). Chaque utilisateur peut couper l'e-mail d'un type via
// profiles.notification_prefs { "<type>": false }.
export const NOTIFICATION_TYPES = [
  "payment_proof_submitted",
  "payment_validated",
  "payment_refused",
  "renewal_reminder",
  "grace_started",
  "read_only",
  "client_grace_started",
  "client_read_only",
  "contact_received",
  "video_received",
  "request_created",
  "comment_added",
  "clip_to_validate",
  "clip_published",
  "clip_changes_requested",
  "request_assigned",
  "clipper_application",
  "clipper_application_received",
  "ticket_created",
  "ticket_reply",
  "ticket_assigned",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Les montants et dates sont transmis bruts (amount_cents + currency,
// date_iso) puis mis en forme dans la langue de chaque destinataire.
type Payload = Record<string, string | number>;

function localize(payload: Payload, locale: Locale): Record<string, string | number> {
  const out: Record<string, string | number> = { ...payload };
  if (typeof payload.amount_cents === "number" && typeof payload.currency === "string") {
    out.amount = formatMoney(payload.amount_cents, payload.currency, locale);
  }
  if (typeof payload.date_iso === "string") out.date = formatDate(payload.date_iso, locale);
  return out;
}

/** Lien interne localisé (ex. "/app/payment" → https://site/fr/app/payment). */
function absoluteLink(locale: Locale, path: string) {
  return `${publicEnv.NEXT_PUBLIC_SITE_URL}/${locale}${path}`;
}

async function renderEmail(type: NotificationType, locale: Locale, payload: Payload, link?: string) {
  const t = await getTranslations({ locale, namespace: "emails" });
  const values = localize(payload, locale);
  const paragraphs = [t(`${type}.body` as never, values as never)];
  return {
    subject: t(`${type}.subject` as never, values as never),
    react: (
      <EmailLayout
        locale={locale}
        preview={t(`${type}.title` as never, values as never)}
        title={t(`${type}.title` as never, values as never)}
        paragraphs={paragraphs}
        cta={link ? { label: t(`${type}.cta` as never), href: absoluteLink(locale, link) } : undefined}
        footer={t("footer")}
      />
    ),
  };
}

/** Notifie des utilisateurs : ligne dans la cloche + e-mail selon leurs préférences. */
export async function notifyUsers(userIds: string[], type: NotificationType, payload: Payload, link?: string) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;
  const admin = createSupabaseAdminClient();
  await admin.from("notifications").insert(ids.map((user_id) => ({ user_id, type, payload: { ...payload, link } })));

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, locale, notification_prefs, is_active")
    .in("id", ids);
  for (const p of profiles ?? []) {
    if (!p.is_active || !p.email) continue;
    if ((p.notification_prefs as Record<string, boolean> | null)?.[type] === false) continue;
    const locale: Locale = p.locale === "en" ? "en" : "fr";
    await sendEmail({ to: p.email, ...(await renderEmail(type, locale, payload, link)) });
  }
}

/** Notifie toutes les personnes ayant une permission (l'owner l'a toujours). */
export async function notifyPermission(permission: string, type: NotificationType, payload: Payload, link?: string) {
  const { data } = await createSupabaseAdminClient().rpc("users_with_permission", { p_permission: permission });
  const ids = ((data as unknown[] | null) ?? []).map((row) =>
    typeof row === "string" ? row : (row as { users_with_permission: string }).users_with_permission,
  );
  await notifyUsers(ids, type, payload, link);
}

/** E-mail vers une adresse hors compte (ex. e-mail de notification de l'agence). */
export async function emailAddress(to: string, type: NotificationType, payload: Payload, link?: string, locale: Locale = "fr") {
  await sendEmail({ to, ...(await renderEmail(type, locale, payload, link)) });
}
