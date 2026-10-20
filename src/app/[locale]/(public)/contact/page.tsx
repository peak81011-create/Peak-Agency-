import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/features/public/contact-form";
import { Section, SectionTitle } from "@/features/public/sections";
import { initPageLocale } from "@/i18n/page";
import { getContent } from "@/lib/content/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("title") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, c] = await Promise.all([getTranslations("contact"), getContent(["contact.lead"], locale)]);
  return (
    <Section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} lead={c["contact.lead"]} />
      <Card className="max-w-3xl md:p-8">
        <ContactForm />
      </Card>
    </Section>
  );
}
