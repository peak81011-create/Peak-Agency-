import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import type { TicketMessage } from "../queries";

/** Messages d'un ticket (les notes internes ne sont jamais renvoyées à l'auteur par la base). */
export async function TicketThread({ messages, viewerId }: { messages: TicketMessage[]; viewerId: string }) {
  const [t, tr, locale] = await Promise.all([getTranslations("support"), getTranslations("roles"), getLocale() as Promise<Locale>]);
  return (
    <ol className="flex flex-col gap-4" data-testid="ticket-thread">
      {messages.map((m) => {
        const me = m.author_id === viewerId;
        const name = m.author?.full_name || t("team");
        return (
          <li key={m.id} className={cn("flex items-start gap-3", me && "flex-row-reverse")}>
            <span aria-hidden className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-300 text-[11px] font-bold text-forest-900">
              {initials(name)}
            </span>
            <div className={cn("flex max-w-[600px] flex-col gap-1", me && "items-end")}>
              <p className="flex flex-wrap items-center gap-2 text-xs text-subtle-foreground">
                {me ? t("you") : m.author ? `${name} · ${tr(m.author.role as "client")}` : name} · {formatDateTime(m.created_at, locale)}
                {m.is_internal ? <Badge tone="amber">{t("internal")}</Badge> : null}
              </p>
              <p
                className={cn(
                  "whitespace-pre-line rounded-lg border px-3.5 py-2.5 text-sm",
                  me ? "border-primary bg-primary text-sage-100" : m.is_internal ? "border-t-amber-bg bg-t-amber-bg text-t-amber-fg" : "border-border bg-sage-50",
                )}
              >
                {m.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
