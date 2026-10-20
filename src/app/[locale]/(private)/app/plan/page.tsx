import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Callout } from "@/components/ui/callout";
import { OnboardingSteps } from "@/features/client/components/onboarding-header";
import { PlanPicker } from "@/features/client/components/plan-picker";
import { getVisiblePlans } from "@/features/client/queries";
import { presentPlan } from "@/features/plans/present";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("client.plan");
  return { title: t("title") };
}

export default async function ChoosePlanPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const client = user.client!;
  if (!client.profileCompleted) redirect({ href: "/app/profile", locale });
  const t = await getTranslations("client.plan");

  // Le choix n'est possible qu'avant le dépôt de la preuve (sinon : page paiement).
  const canChoose = client.status === "inscrit" || client.status === "attente_paiement";
  const plans = await Promise.all((await getVisiblePlans()).map((p) => presentPlan(p, locale)));

  // Offre repérée sur la vitrine avant l'inscription (?plan= ou métadonnée d'inscription).
  const { plan: fromQuery } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const intended = fromQuery ?? (data.user?.user_metadata?.intended_plan as string | undefined);
  const initial = [client.planId, intended].find((id) => id && plans.some((p) => p.id === id)) ?? undefined;

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <PageBody>
        <OnboardingSteps current="plan" />
        <p className="text-muted-foreground">{t("lead")}</p>
        {!canChoose ? (
          <Callout tone="info">{t("locked")}</Callout>
        ) : plans.length === 0 ? (
          <Callout tone="warn">{t("none")}</Callout>
        ) : (
          <PlanPicker plans={plans} initial={initial} />
        )}
      </PageBody>
    </>
  );
}
