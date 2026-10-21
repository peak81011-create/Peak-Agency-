import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { FaqBrowser } from "@/features/faq/faq-browser";
import { getFaq } from "@/features/faq/queries";
import { Section, SectionTitle } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { localizedPath } from "@/lib/public-paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq");
  return { title: t("title") };
}

export default async function FaqPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> }) {
  const locale = await initPageLocale(params);
  const [t, items, query] = await Promise.all([getTranslations("faq"), getFaq(locale), searchParams]);
  return (
    <Section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />
      <FaqBrowser items={items} initialTab={query.tab === "clippers" ? "clipper" : "createur"} />
      <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 md:p-8">
        <p className="text-lg font-semibold">{t("notFound")}</p>
        <Link href={localizedPath("/help", locale)} className={buttonVariants()}>
          {t("contact")}
        </Link>
      </div>
    </Section>
  );
}
