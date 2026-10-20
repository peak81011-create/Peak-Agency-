import { Menu } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getSessionUser, homePathFor } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteHeader() {
  const t = await getTranslations();
  const user = await getSessionUser();
  const links = [
    { href: "/#how", label: t("nav.how") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/#faq", label: t("nav.faq") },
    { href: "/contact", label: t("nav.contact") },
  ] as const;

  const actions = user ? (
    <Link href={homePathFor(user)} className={buttonVariants({ variant: "accent" })}>
      {t("common.mySpace")}
    </Link>
  ) : (
    <>
      <Link href="/login" className={cn(buttonVariants({ variant: "on-dark" }), "border-0")}>
        {t("common.login")}
      </Link>
      <Link href="/pricing" className={buttonVariants({ variant: "accent" })}>
        {t("common.start")}
      </Link>
    </>
  );

  return (
    <header className="border-b border-forest-800 bg-forest-900 text-sage-100">
      <div className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center justify-between gap-6 px-4 md:min-h-20 md:px-8">
        <Link href="/" aria-label={t("common.homeAria")} className="text-sage-400 no-underline">
          <Logo wordmark={t("common.wordmark")} className="[&>span:last-child]:text-sage-100" />
        </Link>
        <nav aria-label={t("nav.mainNav")} className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[15px] font-medium text-sage-200 no-underline hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Suspense>
            <LocaleSwitcher tone="dark" />
          </Suspense>
          <div className="hidden items-center gap-3 md:flex">{actions}</div>
          {/* Menu mobile sans JavaScript */}
          <details className="group relative md:hidden">
            <summary
              aria-label={t("common.openMenu")}
              className={cn(buttonVariants({ variant: "on-dark", size: "icon" }), "list-none border-0 [&::-webkit-details-marker]:hidden")}
            >
              <Menu aria-hidden />
            </summary>
            <div className="absolute right-0 z-20 mt-2 flex w-64 flex-col gap-1 rounded-lg bg-forest-800 p-3 shadow-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex min-h-11 items-center rounded-sm px-3 text-sage-100 no-underline hover:bg-forest-700"
                >
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
