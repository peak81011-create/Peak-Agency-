import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ROLES } from "@/lib/auth/permission-catalog";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.users");
  return { title: t("title") };
}

type Row = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  clients: { id: string; creator_name: string; status: string }[] | null;
};

/** Tous les comptes du site (clients, équipe), réservé à users.manage. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  await requirePermission("users.manage");
  const params = await searchParams;
  const [t, tr, locale] = await Promise.all([getTranslations("admin.users"), getTranslations("roles"), getLocale() as Promise<Locale>]);
  // Lecture côté serveur après contrôle de la permission (liste complète, y compris clients non attribués).
  let query = createSupabaseAdminClient()
    .from("profiles")
    .select("id, email, full_name, role, is_active, last_seen_at, created_at, clients(id, creator_name, status)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (params.role && (ROLES as readonly string[]).includes(params.role)) query = query.eq("role", params.role);
  const q = params.q?.trim().replace(/[%_,()]/g, "");
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("lead")}</p>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <Input name="q" defaultValue={params.q ?? ""} placeholder={t("search")} aria-label={t("search")} className="w-64" />
          <Select name="role" defaultValue={params.role ?? ""} aria-label={t("role")} className="w-auto">
            <option value="">{t("allRoles")}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tr(r)}
              </option>
            ))}
          </Select>
          <button type="submit" className={buttonVariants({ variant: "secondary" })}>
            {t("filter")}
          </button>
        </form>
        <p className="text-sm text-muted-foreground">{t("count", { count: rows.length })}</p>
        <Card className="overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[720px] text-left text-sm" data-testid="users-table">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-subtle-foreground">
                <th className="px-4 py-3">{t("cols.name")}</th>
                <th className="px-4 py-3">{t("cols.role")}</th>
                <th className="px-4 py-3">{t("cols.created")}</th>
                <th className="px-4 py-3">{t("cols.lastSeen")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const client = r.clients?.[0];
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      {client ? (
                        <Link href={`/admin/clients/${client.id}`} className="font-semibold text-forest-700">
                          {client.creator_name || r.full_name || r.email}
                        </Link>
                      ) : (
                        <span className="font-semibold">{r.full_name || "—"}</span>
                      )}
                      <span className="block text-xs text-subtle-foreground">{r.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        <Badge tone={r.role === "client" ? "blue" : "forest"}>{tr(r.role as "client")}</Badge>
                        {!r.is_active ? <Badge tone="red">{t("inactive")}</Badge> : null}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(r.created_at, locale)}</td>
                    <td className="px-4 py-3">{r.last_seen_at ? formatDateTime(r.last_seen_at, locale) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </PageBody>
    </>
  );
}
