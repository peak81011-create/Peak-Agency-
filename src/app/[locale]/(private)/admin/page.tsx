import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { redirect } from "@/i18n/navigation";
import { PERMISSIONS } from "@/lib/auth/permission-catalog";
import { isStaff, requireUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("overview") };
}

export default async function StaffHomePage() {
  const user = await requireUser();
  if (!isStaff(user)) redirect({ href: "/app", locale: await getLocale() });
  const t = await getTranslations();
  const granted = PERMISSIONS.filter((p) => user.permissions.has(p));

  return (
    <>
      <PageHeader eyebrow={t(`areas.${user.role}`)} title={t("dashboard.welcome", { name: user.fullName || user.email })} />
      <PageBody>
        <p className="text-muted-foreground">{t("dashboard.staffLead")}</p>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.permissionsTitle")}</CardTitle>
          </CardHeader>
          <ul className="flex flex-wrap gap-2" data-testid="permission-list">
            {granted.map((p) => (
              <li key={p}>
                <Badge tone="forest" dot={false} className="font-mono">
                  {p}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </PageBody>
    </>
  );
}
