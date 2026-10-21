import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { forAudience, getFaq } from "@/features/faq/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { NewTicketForm } from "@/features/support/components/new-ticket-form";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { fillVars } from "@/lib/content/vars";
import { TICKET_CATEGORIES, audienceOf } from "@/lib/validation/support";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("support");
  return { title: t("new") };
}

export default async function NewTicketPage() {
  const user = await requireUser();
  const locale = (await getLocale()) as Locale;
  const [t, faq, commitments] = await Promise.all([getTranslations("support"), getFaq(locale), getCommitments()]);
  const audience = audienceOf(user);
  const responseLine = fillVars(t.raw("response") as string, commitmentVars(commitments, locale));
  return (
    <>
      <PageHeader title={t("new")} />
      <PageBody>
        <Card className="max-w-3xl md:p-8">
          <NewTicketForm categories={TICKET_CATEGORIES[audience]} faq={forAudience(faq, audience === "clipper" ? "clipper" : "createur")} responseLine={responseLine} />
        </Card>
      </PageBody>
    </>
  );
}
