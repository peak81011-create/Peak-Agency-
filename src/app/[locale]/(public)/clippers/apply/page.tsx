import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { JoinForm } from "@/features/public/join-form";
import { Section, SectionTitle } from "@/features/public/sections";
import { initPageLocale } from "@/i18n/page";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { fillVars } from "@/lib/content/vars";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apply");
  return { title: t("title"), description: t("lead") };
}

export default async function ApplyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, commitments] = await Promise.all([getTranslations("apply"), getCommitments()]);
  const vars = commitmentVars(commitments, locale);
  // Délai de réponse annoncé seulement s'il est renseigné par l'admin.
  const sent = fillVars(t.raw("form.sentWithDelay") as string, vars) ?? t("form.sent");
  return (
    <Section>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <SectionTitle eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
        <Card className="md:p-8">
          <JoinForm minAge={vars.age_minimum} sentMessage={sent} />
        </Card>
      </div>
    </Section>
  );
}
