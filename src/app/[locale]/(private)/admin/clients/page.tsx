import { Download, Search } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { InviteClientForm } from "@/features/admin/agency/components/invite-client-form";
import { listClientsAdmin } from "@/features/admin/agency/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { can, requirePermission } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { cn, initials } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.clients");
  return { title: t("title") };
}

const FILTERS = ["", "actif", "paiement_a_verifier", "attente_paiement", "grace", "lecture_seule", "suspendu", "archive"] as const;

export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requirePermission("clients.read");
  const { status = "", q = "" } = await searchParams;
  const [t, ts, locale, clients] = await Promise.all([
    getTranslations("admin.clients"),
    getTranslations("status.client"),
    getLocale(),
    listClientsAdmin({ status: (FILTERS as readonly string[]).includes(status) && status ? status : undefined, q: q.slice(0, 80) }),
  ]);
  const canInvite = await can(user, "clients.create");

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <a href="/api/exports/clients" download className={buttonVariants({ variant: "secondary" })}>
            <Download aria-hidden />
            {t("export")}
          </a>
        }
      />
      <PageBody>
        <form className="flex flex-wrap items-center gap-2" role="search">
          <label className="flex h-11 min-w-60 grow items-center gap-2 rounded-sm border border-border bg-card px-3 md:grow-0">
            <Search className="size-4 text-subtle-foreground" aria-hidden />
            <span className="sr-only">{t("search")}</span>
            <Input name="q" defaultValue={q} placeholder={t("search")} className="min-h-0 border-0 p-0 focus:ring-0" />
          </label>
          <input type="hidden" name="status" value={status} />
        </form>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f || "all"}
              href={{ pathname: "/admin/clients", query: { ...(f ? { status: f } : {}), ...(q ? { q } : {}) } }}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-[13px] font-medium no-underline",
                status === f ? "border-primary bg-primary text-white" : "border-border-strong bg-card text-muted-foreground",
              )}
            >
              {f ? ts(f) : t("all")}
            </Link>
          ))}
        </div>
        <Card className="p-0 md:p-0">
          {clients.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p> : null}
          <ul className="divide-y divide-sage-100" data-testid="client-list">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/clients/${c.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-inherit no-underline hover:bg-paper md:px-5">
                  <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-300 text-[13px] font-bold">
                    {initials(c.creator_name || c.profile?.full_name || "?")}
                  </span>
                  <span className="min-w-0 grow">
                    <span className="block truncate font-semibold">{c.creator_name || c.profile?.full_name}</span>
                    <span className="text-xs text-subtle-foreground">
                      {[c.profile?.email, c.niche, c.plan ? (locale === "en" ? c.plan.name_en : c.plan.name_fr) : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="hidden text-xs text-subtle-foreground md:inline">
                    {c.assignments.map((a) => a.user?.full_name).filter(Boolean).join(", ")}
                  </span>
                  <span className="text-xs text-subtle-foreground">{c.period_end ? t("until", { date: formatDate(c.period_end, locale) }) : ""}</span>
                  <StatusBadge type="client" value={c.status as never} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        {canInvite ? <InviteClientForm /> : null}
      </PageBody>
    </>
  );
}
