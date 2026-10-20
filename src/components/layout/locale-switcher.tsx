"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** Sélecteur FR/EN (segmenté). `tone="dark"` pour les fonds forêt. */
export function LocaleSwitcher({ tone = "light", long = false }: { tone?: "light" | "dark"; long?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = Object.fromEntries(searchParams.entries());

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex gap-0.5 rounded-sm border p-[3px]",
        tone === "dark" ? "border-forest-700 bg-forest-800" : "border-border bg-muted",
      )}
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={{ pathname, query }}
            locale={l}
            lang={l}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-[34px] min-w-10 items-center justify-center rounded-xs px-3 py-1 text-[13px] font-semibold tracking-wide no-underline",
              tone === "dark"
                ? active
                  ? "bg-accent text-accent-foreground"
                  : "text-sage-300 hover:text-white"
                : active
                  ? "bg-card text-primary shadow-1"
                  : "text-muted-foreground hover:text-primary",
            )}
          >
            {long ? t(`languageLong.${l}`) : t(`languageShort.${l}`)}
          </Link>
        );
      })}
    </div>
  );
}
