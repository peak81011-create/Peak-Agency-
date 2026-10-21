import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { fillVars } from "@/lib/content/vars";
import { localizedPath } from "@/lib/public-paths";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteFooter() {
  const [t, locale, commitments] = await Promise.all([getTranslations(), getLocale() as Promise<Locale>, getCommitments()]);
  const responseLine = fillVars(t.raw("footer.responseTime") as string, commitmentVars(commitments, locale));
  const columns = [
    {
      title: t("footer.creators"),
      links: [
        { href: localizedPath("/creators", locale), label: t("nav.creators") },
        { href: localizedPath("/pricing", locale), label: t("nav.pricing") },
        { href: "/signup", label: t("common.signup") },
      ],
    },
    {
      title: t("footer.clippers"),
      links: [
        { href: "/clippers", label: t("nav.clippersPage") },
        { href: localizedPath("/clippers/apply", locale), label: t("footer.apply") },
        { href: "/legal/clippers", label: t("footer.clipperTerms") },
      ],
    },
    {
      title: t("footer.help"),
      links: [
        { href: "/faq", label: t("nav.faq") },
        { href: localizedPath("/help", locale), label: t("nav.help") },
        { href: "/login", label: t("common.login") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/legal/notice", label: t("footer.legalNotice") },
        { href: "/legal/terms", label: t("footer.terms") },
        { href: "/legal/privacy", label: t("footer.privacy") },
      ],
    },
  ];

  return (
    <footer className="bg-forest-950 pb-8 pt-16 text-sage-300">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-12">
          <div className="flex max-w-80 flex-col gap-4">
            <span className="text-sage-400">
              <Logo wordmark={t("common.wordmark")} className="[&>span:last-child]:text-sage-100" />
            </span>
            <p className="text-[13px] text-sage-400">{t("footer.tagline")}</p>
            {responseLine ? <p className="text-[13px] text-sage-300">{responseLine}</p> : null}
          </div>
          <div className="flex flex-wrap items-start gap-12 md:gap-16">
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-sage-500">{col.title}</span>
                {col.links.map((l) => (
                  <Link key={l.href} href={l.href} className="text-sm text-sage-200 no-underline hover:text-white hover:underline">
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="h-px bg-forest-800" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-sage-500">{t("footer.copyright", { year: new Date().getFullYear() })}</span>
          <Suspense>
            <LocaleSwitcher tone="dark" long />
          </Suspense>
        </div>
      </div>
    </footer>
  );
}
