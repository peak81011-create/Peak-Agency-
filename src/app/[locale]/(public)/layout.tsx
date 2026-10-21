import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { RevealObserver } from "@/components/three/effects";
import { INTRO_SCRIPT, IntroSplash } from "@/components/three/intro";
import { HelpWidget } from "@/features/faq/help-widget";
import { getFaq } from "@/features/faq/queries";
import { TrackPageView } from "@/features/traffic/track-page-view";
import type { Locale } from "@/i18n/routing";
import { getSessionUser } from "@/lib/auth/session";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [faq, user, t] = await Promise.all([getFaq((await getLocale()) as Locale), getSessionUser(), getTranslations("common")]);
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Décide, avant l'affichage, si l'écran d'entrée 3D est joué */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      <IntroSplash word="PEAK" tagline={t("wordmark")} />
      <SiteHeader />
      <main id="main" className="grow">
        {children}
      </main>
      <SiteFooter />
      <HelpWidget items={faq} signedIn={!!user} />
      <TrackPageView />
      <RevealObserver />
    </div>
  );
}
