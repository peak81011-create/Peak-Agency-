import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { HelpWidget } from "@/features/faq/help-widget";
import { getFaq } from "@/features/faq/queries";
import type { Locale } from "@/i18n/routing";
import { getSessionUser } from "@/lib/auth/session";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [faq, user] = await Promise.all([getFaq((await getLocale()) as Locale), getSessionUser()]);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="grow">
        {children}
      </main>
      <SiteFooter />
      <HelpWidget items={faq} signedIn={!!user} />
    </div>
  );
}
