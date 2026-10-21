"use client";

import { LifeBuoy, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizedPath } from "@/lib/public-paths";
import { cn } from "@/lib/utils";
import { AnswerText } from "./answer-text";
import type { FaqAudience, FaqEntry } from "./queries";
import { searchFaq } from "./search";

/**
 * Bouton « Besoin d'aide ? » présent sur toutes les pages : recherche dans la
 * FAQ, questions fréquentes du public concerné, contact de l'équipe.
 */
export function HelpWidget({ items, audience, signedIn = false }: { items: FaqEntry[]; audience?: FaqAudience; signedIn?: boolean }) {
  const t = useTranslations("helpWidget");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string>();
  const who: FaqAudience = audience ?? (pathname.startsWith("/clippers") ? "clipper" : "createur");
  const scoped = items.filter((i) => i.audience === who || i.audience === "tous");
  const shown = query.trim() ? searchFaq(scoped, query, 5) : scoped.filter((i) => i.isTop).slice(0, 3);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 print:hidden">
      {open ? (
        <div role="dialog" aria-label={t("title")} className="flex max-h-[70dvh] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-3">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="font-semibold">{t("title")}</p>
            <button type="button" aria-label={t("close")} onClick={() => setOpen(false)} className="rounded-sm p-1 hover:bg-muted">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="pl-9" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle-foreground">{query.trim() ? t("results") : t("frequent")}</p>
            {shown.length === 0 && query.trim() ? <p className="text-sm text-muted-foreground">{t("noResult")}</p> : null}
            <ul className="flex flex-col gap-1">
              {shown.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    aria-expanded={expanded === i.id}
                    onClick={() => setExpanded(expanded === i.id ? undefined : i.id)}
                    className="w-full rounded-sm px-2 py-2 text-left text-sm font-semibold hover:bg-muted"
                  >
                    {i.question}
                  </button>
                  {expanded === i.id ? (
                    <p className="px-2 pb-2 text-sm text-muted-foreground">
                      <AnswerText text={i.answer} />
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-border p-4">
            <Link href={signedIn ? "/support/new" : localizedPath("/help", locale)} onClick={() => setOpen(false)} className={cn(buttonVariants(), "w-full")}>
              {t("contact")}
            </Link>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-3 hover:bg-primary-hover"
      >
        <LifeBuoy className="size-5" aria-hidden />
        {t("button")}
      </button>
    </div>
  );
}
