import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AnswerText } from "@/features/faq/answer-text";
import { getFaq } from "@/features/faq/queries";
import { ContactForm } from "@/features/public/contact-form";
import { Section, SectionTitle } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { getSessionUser } from "@/lib/auth/session";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { fillVars } from "@/lib/content/vars";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return { title: t("title") };
}

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await initPageLocale(params);
  const [t, faq, commitments, user] = await Promise.all([getTranslations("help"), getFaq(locale), getCommitments(), getSessionUser()]);
  const response = fillVars(t.raw("response") as string, commitmentVars(commitments, locale));
  const top = faq.filter((f) => f.isTop).slice(0, 6);

  return (
    <Section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("quick")}</CardTitle>
          </CardHeader>
          <ul className="flex flex-col divide-y divide-border">
            {top.map((f) => (
              <li key={f.id} className="py-3">
                <details className="group">
                  <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">{f.question}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <AnswerText text={f.answer} />
                  </p>
                </details>
              </li>
            ))}
          </ul>
          <Link href="/faq" className="mt-4 inline-block text-sm font-semibold text-forest-700">
            {t("allFaq")}
          </Link>
        </Card>
        <Card className="md:p-8">
          <CardHeader>
            <CardTitle>{t("contactTitle")}</CardTitle>
          </CardHeader>
          {response ? <p className="-mt-2 mb-4 text-sm font-medium text-forest-700">{response}</p> : null}
          {user ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">{t("signedIn")}</p>
              <Link href="/support/new" className={buttonVariants()}>
                {t("openTicket")}
              </Link>
            </div>
          ) : (
            <ContactForm />
          )}
        </Card>
      </div>
    </Section>
  );
}
