"use client";

import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizedPath } from "@/lib/public-paths";

const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

/** Texte de réponse : seuls les liens internes « [libellé](/page) » sont interprétés. */
export function AnswerText({ text }: { text: string }) {
  const locale = useLocale() as Locale;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <Link key={m.index} href={localizedPath(m[2], locale)} className="font-semibold text-forest-700">
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
