import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Callout } from "@/components/ui/callout";
import { getVisiblePlans } from "@/features/client/queries";
import { PlanCard } from "@/features/plans/plan-card";
import { presentPlan } from "@/features/plans/present";
import { PlanCta } from "@/features/public/plan-cta";
import { Section, SectionTitle } from "@/features/public/sections";
import { initPageLocale } from "@/i18n/page";
import { getSessionUser } from "@/lib/auth/session";
import { getContent } from "@/lib/content/site-content";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("pricing") };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, c, plans, user] = await Promise.all([
    getTranslations("home"),
    getContent(["pricing.title", "pricing.lead", "pricing.note"], locale),
    getVisiblePlans(),
    getSessionUser(),
  ]);
  const views = await Promise.all(plans.map((p) => presentPlan(p, locale)));

  return (
    <Section>
      <SectionTitle eyebrow={(await getTranslations("nav"))("pricing")} title={c["pricing.title"]} lead={c["pricing.lead"]} />
      {views.length === 0 ? (
        <Callout tone="info">{t("noPlans")}</Callout>
      ) : (
        <div className={cn("grid gap-6 pt-4", views.length > 1 && "md:grid-cols-2 lg:grid-cols-3")} data-testid="pricing-plans">
          {views.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              featuredLabel={t("featured")}
              action={<PlanCta planId={p.id} featured={p.featured} user={user} label={t("choose")} />}
            />
          ))}
        </div>
      )}
      {c["pricing.note"] ? <p className="max-w-3xl text-sm text-muted-foreground">{c["pricing.note"]}</p> : null}
    </Section>
  );
}
