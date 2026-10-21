import { Menu } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getSessionUser, homePathFor } from "@/lib/auth/session";
import { localizedPath } from "@/lib/public-paths";
import { cn } from "@/lib/utils";
import { HeaderCta, PillLink } from "./header-cta";
import { LocaleSwitcher } from "./locale-switcher";

/** En-tête flottant : une carte blanche arrondie qui reste en haut de l'écran. */
export async function SiteHeader() {
  const [t, locale, user] = await Promise.all([getTranslations(), getLocale() as Promise<Locale>, getSessionUser()]);
  const links = [
    { href: localizedPath("/creators", locale), label: t("nav.creators") },
    { href: "/clippers", label: t("nav.clippersPage") },
    { href: localizedPath("/pricing", locale), label: t("nav.pricing") },
    { href: "/faq", label: t("nav.faq") },
  ];
  const cta = { creators: t("nav.ctaCreators"), clippers: t("nav.ctaClippers"), start: t("common.start") };

  const actions = user ? (
    <PillLink href={homePathFor(user)} label={t("common.mySpace")} />
  ) : (
    <>
      <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "font-semibold")}>
        {t("common.login")}
      </Link>
      <HeaderCta labels={cta} />
    </>
  );

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto flex min-h-16 w-full max-w-[1120px] items-center justify-between gap-4 rounded-2xl border border-border bg-white/95 px-4 shadow-2 backdrop-blur md:min-h-[76px] md:px-6">
        <Link href="/" aria-label={t("common.homeAria")} className="text-forest-900 no-underline">
          <Logo wordmark={t("common.wordmark")} />
        </Link>
        <nav aria-label={t("nav.mainNav")} className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[16px] font-medium text-text-2 no-underline hover:text-forest-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Suspense>
            <LocaleSwitcher />
          </Suspense>
          <div className="hidden items-center gap-2 lg:flex">{actions}</div>
          {/* Menu mobile sans JavaScript */}
          <details className="group relative lg:hidden">
            <summary
              aria-label={t("common.openMenu")}
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "list-none [&::-webkit-details-marker]:hidden")}
            >
              <Menu aria-hidden />
            </summary>
            <div className="absolute right-0 z-20 mt-3 flex w-64 flex-col gap-1 rounded-2xl border border-border bg-white p-3 shadow-3">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="flex min-h-11 items-center rounded-md px-3 font-medium text-foreground no-underline hover:bg-muted">
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2">{actions}</div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
