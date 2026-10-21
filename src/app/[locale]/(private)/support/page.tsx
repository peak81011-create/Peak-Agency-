import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { listTickets } from "@/features/support/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("support");
  return { title: t("title") };
}

export default async function SupportPage() {
  const user = await requireUser();
  const [t, tc, locale, tickets] = await Promise.all([
    getTranslations("support"),
    getTranslations("support.categories"),
    getLocale() as Promise<Locale>,
    listTickets({ authorId: user.id }),
  ]);
  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <Link href="/support/new" className={buttonVariants()}>
            {t("new")}
          </Link>
        }
      />
      <PageBody>
        {tickets.length === 0 ? (
          <Card className="flex flex-col items-start gap-3">
            <p className="font-semibold">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
            <Link href="/support/new" className={buttonVariants()}>
              {t("new")}
            </Link>
          </Card>
        ) : (
          <Card className="p-0 md:p-0">
            <ul className="divide-y divide-border" data-testid="my-tickets">
              {tickets.map((tk) => (
                <li key={tk.id}>
                  <Link href={`/support/${tk.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-inherit no-underline hover:bg-paper">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{tk.subject}</span>
                      <span className="text-xs text-subtle-foreground">
                        #{tk.number} · {tc(tk.category as never)} · {formatDateTime(tk.created_at, locale)}
                      </span>
                    </span>
                    <StatusBadge type="ticket" value={tk.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </PageBody>
    </>
  );
}
