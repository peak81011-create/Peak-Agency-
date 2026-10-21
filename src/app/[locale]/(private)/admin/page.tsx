import { CheckCircle2, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { PERMISSIONS } from "@/lib/auth/permission-catalog";
import { can, requireUser } from "@/lib/auth/session";
import { getCommitments, missingCommitments } from "@/lib/commitments";
import { getSettings, hasPaymentMethod, missingInvoiceFields } from "@/lib/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("overview") };
}

/** Points à régler avant la mise en ligne (variables vides, offres « démo », informations légales). */
async function LaunchChecklist() {
  const t = await getTranslations("admin.launch");
  const [commitments, company, bank, { data: demoPlans }] = await Promise.all([
    getCommitments(),
    getSettings("company"),
    getSettings("bank"),
    createSupabaseAdminClient().from("plans").select("id, name_fr").eq("is_demo", true),
  ]);
  const tv = await getTranslations("admin.settings.commitments.fields");
  const items = [
    ...missingCommitments(commitments).map((k) => ({ key: `var-${k}`, label: t("variable", { name: tv(k as never) }), href: "/admin/settings" as const })),
    ...(demoPlans ?? []).map((p) => ({ key: `plan-${p.id}`, label: t("demoPlan", { name: p.name_fr }), href: `/admin/plans/${p.id}` })),
    ...(missingInvoiceFields(company).length ? [{ key: "company", label: t("company"), href: "/admin/settings" as const }] : []),
    ...(hasPaymentMethod(bank) ? [] : [{ key: "bank", label: t("bank"), href: "/admin/settings" as const }]),
  ];
  return (
    <Card data-testid="launch-checklist">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-forest-700">
          <CheckCircle2 className="size-4" aria-hidden />
          {t("done")}
        </p>
      ) : (
        <>
          <p className="-mt-2 mb-3 text-sm text-muted-foreground">{t("lead", { count: items.length })}</p>
          <ul className="flex flex-col divide-y divide-border">
            {items.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className="flex items-center gap-3 py-2.5 text-sm text-inherit no-underline hover:text-forest-700">
                  <CircleAlert className="size-4 shrink-0 text-t-amber-fg" aria-hidden />
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export default async function StaffHomePage() {
  const user = await requireUser();
  const t = await getTranslations();
  const granted = PERMISSIONS.filter((p) => user.permissions.has(p));
  const showChecklist = await can(user, "settings.update");

  return (
    <>
      <PageHeader eyebrow={t(`areas.${user.role}`)} title={t("dashboard.welcome", { name: user.fullName || user.email })} />
      <PageBody>
        {showChecklist ? <LaunchChecklist /> : null}
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
