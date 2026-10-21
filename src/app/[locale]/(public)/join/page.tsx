import { Check } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { JoinForm } from "@/features/public/join-form";
import { Section, SectionTitle } from "@/features/public/sections";
import { initPageLocale } from "@/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join");
  return { title: t("title"), description: t("lead") };
}

const LOOKING_FOR = ["one", "two", "three", "four"] as const;

export default async function JoinPage({ params }: { params: Promise<{ locale: string }> }) {
  await initPageLocale(params);
  const t = await getTranslations("join");
  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="flex flex-col gap-8">
          <SectionTitle eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-subtle-foreground">{t("lookingFor.title")}</h2>
            <ul className="flex flex-col gap-3">
              {LOOKING_FOR.map((k) => (
                <li key={k} className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-forest-600" aria-hidden />
                  <span>{t(`lookingFor.${k}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">{t("next")}</p>
        </div>
        <Card className="md:p-8">
          <JoinForm />
        </Card>
      </div>
    </Section>
  );
}
