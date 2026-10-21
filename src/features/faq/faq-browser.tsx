"use client";

import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { voteFaqAction } from "./actions";
import { AnswerText } from "./answer-text";
import type { FaqAudience, FaqEntry } from "./queries";
import { searchFaq } from "./search";

function Vote({ id }: { id: string }) {
  const t = useTranslations("faq");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  if (done) return <p className="text-xs text-subtle-foreground">{t("thanks")}</p>;
  const vote = (helpful: boolean) =>
    startTransition(async () => {
      await voteFaqAction(id, helpful);
      setDone(true);
    });
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-subtle-foreground">
      {t("helpful")}
      <button type="button" disabled={pending} onClick={() => vote(true)} className="rounded-full border border-border-strong px-2.5 py-1 font-semibold hover:bg-muted">
        {t("yes")}
      </button>
      <button type="button" disabled={pending} onClick={() => vote(false)} className="rounded-full border border-border-strong px-2.5 py-1 font-semibold hover:bg-muted">
        {t("no")}
      </button>
    </p>
  );
}

/** FAQ à deux onglets (créateurs / clippers) avec recherche instantanée. */
export function FaqBrowser({ items, initialTab }: { items: FaqEntry[]; initialTab: FaqAudience }) {
  const t = useTranslations("faq");
  const [tab, setTab] = useState<FaqAudience>(initialTab);
  const [query, setQuery] = useState("");
  const scoped = useMemo(() => items.filter((i) => i.audience === tab || i.audience === "tous"), [items, tab]);
  const shown = query.trim() ? searchFaq(scoped, query) : scoped;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label={t("tabsLabel")} className="inline-flex gap-0.5 self-start rounded-sm border border-border bg-muted p-[3px]">
          {(["createur", "clipper"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={tab === a}
              onClick={() => setTab(a)}
              className={cn("min-h-10 rounded-xs px-4 text-sm font-semibold", tab === a ? "bg-card text-primary shadow-1" : "text-muted-foreground")}
            >
              {t(`tabs.${a}`)}
            </button>
          ))}
        </div>
        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchLabel")} className="pl-9" />
        </div>
      </div>
      {shown.length === 0 ? <p className="text-muted-foreground">{t("noResult")}</p> : null}
      <div className="flex flex-col" data-testid="faq-list">
        {shown.map((item) => (
          <details key={item.id} className="group border-b border-border-strong">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold md:text-lg [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus className="size-5 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
            </summary>
            <div className="flex max-w-[720px] flex-col gap-3 pb-5">
              <p className="text-muted-foreground">
                <AnswerText text={item.answer} />
              </p>
              <Vote id={item.id} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
