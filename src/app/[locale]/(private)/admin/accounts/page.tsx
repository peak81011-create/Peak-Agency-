import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlatformBadge } from "@/components/ui/platform-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAccounts } from "@/features/agency/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { can, requirePermission } from "@/lib/auth/session";
import { formatCompact } from "@/lib/format-number";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.accounts");
  return { title: t("title") };
}

export default async function AdminAccountsPage() {
  const user = await requirePermission("accounts.read");
  const [t, locale, accounts, canManage] = await Promise.all([
    getTranslations("admin.accounts"),
    getLocale(),
    listAccounts({}),
    can(user, "accounts.manage"),
  ]);
  const total = accounts.reduce((a, b) => a + b.followers_count, 0);

  return (
    <>
      <PageHeader
        eyebrow={t("summary", { count: accounts.length, followers: formatCompact(total, locale) })}
        title={t("title")}
        actions={
          canManage ? (
            <Link href="/admin/accounts/new" className={buttonVariants()}>
              <Plus aria-hidden />
              {t("new")}
            </Link>
          ) : null
        }
      />
      <PageBody>
        <p className="text-sm text-muted-foreground">{t("passwordPolicy")}</p>
        <Card className="p-0 md:p-0">
          {accounts.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p> : null}
          <ul className="divide-y divide-sage-100">
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <PlatformBadge platform={a.platform} />
                <span className="min-w-0 grow">
                  <span className="block truncate font-semibold">{a.handle}</span>
                  <span className="text-xs text-subtle-foreground">
                    {a.client?.creator_name} · {a.owner?.full_name ?? "—"} · {t("clips", { count: a.clips?.[0]?.count ?? 0 })}
                  </span>
                </span>
                <span className="tabular-nums text-sm">{formatCompact(a.followers_count, locale)}</span>
                <StatusBadge type="account" value={a.status} />
                {canManage ? (
                  <Link href={`/admin/accounts/${a.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    {t("edit")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </PageBody>
    </>
  );
}
