import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { PlanForm } from "@/features/admin/plans/plan-form";
import { planToForm } from "@/features/admin/plans/to-form";
import { PLAN_COLUMNS, type PlanRow } from "@/features/client/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { requirePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.plans");
  return { title: t("title") };
}

// /admin/plans/new pour créer, /admin/plans/<id> pour modifier.
export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("plans.manage");
  const { id } = await params;
  const t = await getTranslations("admin.plans");
  let plan: PlanRow | null = null;
  if (id !== "new") {
    if (!z.uuid().safeParse(id).success) notFound();
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("plans").select(PLAN_COLUMNS).eq("id", id).maybeSingle();
    if (!data) notFound();
    plan = data as PlanRow;
  }

  return (
    <>
      <PageHeader title={plan ? t("editTitle") : t("new")} />
      <PageBody>
        {plan?.is_demo ? <Callout tone="warn">{t("demoEditHint")}</Callout> : null}
        <Card>
          <PlanForm planId={plan?.id ?? null} defaults={planToForm(plan)} />
        </Card>
      </PageBody>
    </>
  );
}
