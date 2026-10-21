import { Check } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { getPublicPlans } from "@/features/plans/catalog";
import { AnswerText } from "@/features/faq/answer-text";
import { forAudience, getFaq } from "@/features/faq/queries";
import { OfferBubble } from "@/features/plans/offer-bubble";
import { offerLabels } from "@/features/plans/offer-labels";
import { presentPlan } from "@/features/plans/present";
import { PaymentMethods, PerClipBanner } from "@/features/public/blocks";
import { PlanCta } from "@/features/public/plan-cta";
import { Section, SectionTitle } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { getSessionUser } from "@/lib/auth/session";
import { getContent } from "@/lib/content/site-content";
import { localizedPath, offerPath } from "@/lib/public-paths";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("pricing") };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, th, c, plans, user, labels, faq] = await Promise.all([
    getTranslations("offers"),
    getTranslations("home"),
    getContent(["pricing.title", "pricing.lead", "pricing.note"], locale),
    getPublicPlans(),
    getSessionUser(),
    offerLabels(),
    getFaq(locale),
  ]);
  const views = await Promise.all(plans.map((p) => presentPlan(p, locale)));
  const questions = forAudience(faq, "createur")
    .filter((f) => /prix|coût|paie|clips|offre|price|cost|pay|plan/i.test(f.question))
    .slice(0, 6);

  return (
    <>
      <section className="peak-glow">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col items-center gap-5 px-4 pb-6 pt-14 text-center md:px-8 md:pt-20">
          <p className="rounded-full bg-money-600 px-4 py-1.5 text-sm font-bold text-white shadow-2">{t("hero.price")}</p>
          <h1 className="text-balance font-display text-[40px] font-extrabold leading-[1.02] tracking-tight text-forest-900 md:text-6xl [font-stretch:115%]">
            {c["pricing.title"] || t("hero.title")}
          </h1>
          <p className="max-w-2xl text-pretty text-[17px] text-text-2 md:text-[19px]">{c["pricing.lead"] || t("hero.lead")}</p>
        </div>
      </section>

      <Section className="bg-money-50 pt-8 md:pt-12">
        {views.length === 0 ? (
          <Callout tone="info">{th("noPlans")}</Callout>
        ) : (
          <div className={cn("grid gap-6 pt-4", views.length > 1 && "md:grid-cols-2 xl:grid-cols-4")} data-testid="pricing-plans">
            {views.map((p, i) => (
              <OfferBubble
                key={p.id}
                index={i}
                plan={p}
                href={p.slug ? offerPath(p.slug, locale) : localizedPath("/pricing", locale)}
                labels={labels}
                action={<PlanCta planId={p.id} featured={p.featured} user={user} label={th("choose")} />}
              />
            ))}
          </div>
        )}
        {c["pricing.note"] ? <p className="max-w-3xl text-sm text-muted-foreground">{c["pricing.note"]}</p> : null}
      </Section>

      <PerClipBanner />

      {views.length > 1 ? (
        <Section tone="paper">
          <SectionTitle eyebrow={t("compare.eyebrow")} title={t("compare.title")} />
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3" />
                  {views.map((p) => (
                    <th key={p.id} className="px-4 py-3 font-display text-base font-bold [font-stretch:108%]">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("compare.price")}</th>
                  {views.map((p) => (
                    <td key={p.id} className="px-4 py-3 font-semibold">
                      {p.price} <span className="font-normal text-muted-foreground">{p.period}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("compare.perClip")}</th>
                  {views.map((p) => (
                    <td key={p.id} className="px-4 py-3">{p.perClip ?? "—"}</td>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("compare.clips")}</th>
                  {views.map((p) => (
                    <td key={p.id} className="px-4 py-3">{p.clipsPerPeriod ?? "—"}</td>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("compare.length")}</th>
                  {views.map((p) => (
                    <td key={p.id} className="px-4 py-3">{p.clipLength || "—"}</td>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("compare.accounts")}</th>
                  {views.map((p) => (
                    <td key={p.id} className="px-4 py-3">{p.accounts ?? "—"}</td>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("compare.platforms")}</th>
                  {views.map((p) => (
                    <td key={p.id} className="px-4 py-3">{p.platforms.join(", ") || "—"}</td>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("compare.delivery")}</th>
                  {views.map((p) => (
                    <td key={p.id} className="px-4 py-3">{p.deliveryDays ? labels.delivery(p.deliveryDays) : "—"}</td>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("compare.approval")}</th>
                  {views.map((p) => (
                    <td key={p.id} className="px-4 py-3">
                      <Check className="size-4 text-money-600" aria-label={t("compare.yes")} />
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      <PaymentMethods />

      {questions.length ? (
        <Section tone="paper">
          <SectionTitle eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
          <div className="flex flex-col">
            {questions.map((q) => (
              <details key={q.id} className="group border-b border-border-strong" open>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold md:text-lg [&::-webkit-details-marker]:hidden">
                  {q.question}
                </summary>
                <p className="max-w-[720px] pb-5 text-muted-foreground">
                  <AnswerText text={q.answer} />
                </p>
              </details>
            ))}
          </div>
          <Link href="/faq" className={cn(buttonVariants({ variant: "secondary" }), "self-start")}>
            {t("faq.all")}
          </Link>
        </Section>
      ) : null}
    </>
  );
}
