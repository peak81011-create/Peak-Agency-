import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteFooter() {
  const t = await getTranslations();
  const columns = [
    {
      title: t("footer.agency"),
      links: [
        { href: "/#how", label: t("nav.how") },
        { href: "/pricing", label: t("nav.pricing") },
        { href: "/#faq", label: t("nav.faq") },
        { href: "/contact", label: t("nav.contact") },
      ],
    },
    {
      title: t("footer.space"),
      links: [
        { href: "/login", label: t("common.login") },
        { href: "/signup", label: t("common.signup") },
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
