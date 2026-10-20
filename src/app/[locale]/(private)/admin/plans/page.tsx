import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { PLAN_COLUMNS, type PlanRow } from "@/features/client/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.plans");
  return { title: t("title") };
}

export default async function AdminPlansPage() {
  await requirePermission("plans.manage");
  const locale = await getLocale();
  const t = await getTranslations("admin.plans");
  const tp = await getTranslations("plans");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("plans").select(PLAN_COLUMNS).order("sort_order");
  const plans = (data ?? []) as PlanRow[];

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <Link href="/admin/plans/new" className={buttonVariants()}>
            <Plus aria-hidden />
            {t("new")}
          </Link>
        }
      />
      <PageBody>
        {plans.some((p) => p.is_demo) ? <Callout tone="warn">{t("demoWarning")}</Callout> : null}
        <Card className="p-0 md:p-0">
          <ul className="divide-y divide-sage-100">
            {plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {locale === "en" ? p.name_en : p.name_fr}
                    {p.is_demo ? <Badge tone="amber">{t("demo")}</Badge> : null}
                    {p.is_featured ? <Badge tone="forest" dot={false}>{t("featured")}</Badge> : null}
                    {!p.is_visible ? <Badge tone="neutral">{t("hidden")}</Badge> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(p.price_cents, p.currency, locale)} {tp(`periods.${p.billing_period}`)}
                  </p>
                </div>
                <Link href={`/admin/plans/${p.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  {t("edit")}
                </Link>
              </li>
            ))}
          </ul>
          {plans.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p> : null}
        </Card>
      </PageBody>
    </>
  );
}
