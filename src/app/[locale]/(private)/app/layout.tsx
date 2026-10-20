import { TriangleAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { getClientDetail } from "@/features/client/queries";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";

// Espace client : réservé au rôle client (l'équipe a son espace /admin).
// Affiche le bandeau « délai de grâce » ou « lecture seule » sur toutes les pages.
export default async function ClientAreaLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const locale = await getLocale();
  if (user.role !== "client" || !user.client) redirect({ href: "/admin", locale });
  const status = user.client!.status;

  let banner: ReactNode = null;
  if (status === "grace" || status === "lecture_seule") {
    const [t, client, billing] = await Promise.all([
      getTranslations("client.banners"),
      getClientDetail(user.client!.id),
      getSettings("billing"),
    ]);
    const end = client?.period_end ?? null;
    const graceEnd = end ? new Date(new Date(`${end}T12:00:00Z`).getTime() + billing.grace_days * 86_400_000) : null;
    banner = (
      <div role="status" className="flex flex-wrap items-center gap-3 border-b border-t-amber-bg bg-t-amber-bg px-4 py-3 text-sm text-t-amber-fg md:px-10">
        <TriangleAlert className="size-5 shrink-0" aria-hidden />
        <span className="min-w-60 grow">
          {status === "grace"
            ? t("grace", { end: formatDate(end, locale), until: formatDate(graceEnd, locale) })
            : t("readOnly", { end: formatDate(end, locale) })}
        </span>
        <Link href="/app/payment" className="font-semibold text-t-amber-fg underline">
          {t("renew")}
        </Link>
      </div>
    );
  }
  return (
    <>
      {banner}
      {children}
    </>
  );
}
