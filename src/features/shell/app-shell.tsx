import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/features/auth/actions";
import { homePathFor, type SessionUser } from "@/lib/auth/session";
import { initials } from "@/lib/utils";
import { navFor } from "./nav";
import { MobileTabs, SidebarLinks } from "./nav-links";

/** Gabarit de l'espace privé : barre latérale (bureau) ou barre + onglets (mobile). */
export async function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const t = await getTranslations();
  const items = navFor(user);
  const home = homePathFor(user);
  const displayName = user.fullName || user.email;

  const logout = (
    <form action={logoutAction}>
      <Button type="submit" variant="on-dark" size="icon" className="border-0" aria-label={t("common.logout")}>
        <LogOut aria-hidden />
      </Button>
    </form>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-3">
        {t("common.skipToContent")}
      </a>

      {/* Bureau */}
      <aside className="hidden w-64 shrink-0 bg-sidebar text-sage-200 md:block">
        <nav aria-label={t("nav.appNav")} className="sticky top-0 flex h-dvh flex-col gap-7 px-4 pb-5 pt-7">
          <div className="flex flex-col px-2 text-sage-300">
            <Link href={home} aria-label={t("common.homeAria")} className="text-sage-300 no-underline">
              <Logo wordmark={t("common.wordmark")} className="[&>span:last-child]:text-sage-200" />
            </Link>
            <span className="mt-2.5 text-xs text-sage-400">{t(`areas.${user.role}`)}</span>
          </div>
          <SidebarLinks items={items} />
          <div className="mt-auto flex items-center gap-2.5 rounded-md bg-sidebar-hover p-3">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-300 text-[11px] font-bold text-forest-900">
              {initials(displayName)}
            </span>
            <div className="flex min-w-0 grow flex-col">
              <span className="truncate text-[13px] font-semibold text-white">{displayName}</span>
              <span className="truncate text-xs text-sage-400">{t(`roles.${user.role}`)}</span>
            </div>
            {logout}
          </div>
        </nav>
      </aside>

      {/* Mobile */}
      <nav aria-label={t("nav.mobileNav")} className="flex flex-col gap-2.5 bg-sidebar px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Link href={home} aria-label={t("common.homeAria")} className="inline-flex min-h-11 min-w-8 items-center justify-center text-sage-400">
            <LogoMark className="h-7 w-3.5" />
          </Link>
          <span className="grow truncate font-display text-[17px] font-bold text-white [font-stretch:110%]">
            {t(`areas.${user.role}`)}
          </span>
          <Suspense>
            <LocaleSwitcher tone="dark" />
          </Suspense>
          {logout}
        </div>
        <MobileTabs items={items} />
      </nav>

      <div className="flex min-w-0 grow flex-col">
        <header className="hidden items-center justify-end gap-3 border-b border-border bg-paper px-10 py-3.5 md:flex">
          <Suspense>
            <LocaleSwitcher />
          </Suspense>
          <span
            aria-hidden
            className="inline-flex size-7 items-center justify-center rounded-full bg-forest-700 text-[11px] font-bold text-sage-100"
          >
            {initials(displayName)}
          </span>
        </header>
        <main id="main" className="flex grow flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}

/** En-tête de page (sur-titre + titre + actions). */
export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-1 pt-5 md:px-10 md:pb-2 md:pt-7">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.06em] text-subtle-foreground">{eyebrow}</p> : null}
        <h1 className="mt-1 font-display text-[26px] font-bold leading-tight tracking-tight md:text-3xl [font-stretch:110%]">
          {title}
        </h1>
      </div>
      {actions}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 px-4 pb-10 pt-4 md:gap-6 md:px-10 md:pb-14 md:pt-5">{children}</div>;
}
