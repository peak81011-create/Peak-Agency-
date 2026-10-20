import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

const UNLOCKED = new Set(["actif", "grace", "lecture_seule"]);

export default async function ClientDashboardPage() {
  const user = await requireUser();
  if (user.role !== "client" || !user.client) redirect({ href: "/admin", locale: await getLocale() });
  const client = user.client!;
  const t = await getTranslations();

  return (
    <>
      <PageHeader
        eyebrow={t("areas.client")}
        title={t("dashboard.welcome", { name: client.creatorName || user.fullName || user.email })}
      />
      <PageBody>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.clientStatus")}</CardTitle>
            <StatusBadge type="client" value={client.status} />
          </CardHeader>
          {!UNLOCKED.has(client.status) ? (
            <div className="flex items-start gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted text-forest-700">
                <Lock className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-semibold">{t("dashboard.clientLockedTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("dashboard.clientLockedLead")}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("common.comingSoon")}</p>
          )}
        </Card>
      </PageBody>
    </>
  );
}
