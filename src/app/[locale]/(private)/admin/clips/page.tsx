import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PlatformBadge } from "@/components/ui/platform-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClipStatusSelect } from "@/features/admin/agency/components/clip-status-select";
import { staffOptions } from "@/features/admin/agency/queries";
import { listClips, type ClipStatus } from "@/features/agency/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { can, requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.clips");
  return { title: t("title") };
}

const COLUMNS: ClipStatus[] = ["planifie", "en_montage", "a_valider", "valide", "programme", "publie", "rejete"];
const uuid = /^[0-9a-f-]{36}$/;

export default async function AdminClipsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; client?: string; clipper?: string; status?: string }>;
}) {
  const user = await requirePermission("clips.read");
  const params = await searchParams;
  const view = params.view === "list" ? "list" : "kanban";
  const clientId = params.client && uuid.test(params.client) ? params.client : undefined;
  const clipperId = params.clipper === "me" ? user.id : params.clipper && uuid.test(params.clipper) ? params.clipper : undefined;
  const status = COLUMNS.find((s) => s === params.status);

  const supabase = await createSupabaseServerClient();
  const [t, ts, locale, clips, staff, { data: clients }, canCreate] = await Promise.all([
    getTranslations("admin.clips"),
    getTranslations("status.clip"),
    getLocale(),
    listClips({ clientId, clipperId, statuses: status ? [status] : undefined, order: "upcoming", limit: 500 }),
    staffOptions(),
    supabase.from("clients").select("id, creator_name").order("creator_name"),
    can(user, "clips.create"),
  ]);
  const query = (extra: Record<string, string>) => ({
    ...(clientId ? { client: clientId } : {}),
    ...(params.clipper ? { clipper: params.clipper } : {}),
    ...(status ? { status } : {}),
    view,
    ...extra,
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          canCreate ? (
            <Link href="/admin/clips/new" className={buttonVariants()}>
              <Plus aria-hidden />
              {t("new")}
            </Link>
          ) : null
        }
      />
      <PageBody>
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="view" value={view} />
          <Select name="client" defaultValue={clientId ?? ""} aria-label={t("filters.client")} className="w-auto min-w-44">
            <option value="">{t("filters.allClients")}</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.creator_name}
              </option>
            ))}
          </Select>
          <Select name="clipper" defaultValue={params.clipper ?? ""} aria-label={t("filters.clipper")} className="w-auto min-w-44">
            <option value="">{t("filters.allClippers")}</option>
            <option value="me">{t("filters.mine")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={status ?? ""} aria-label={t("filters.status")} className="w-auto min-w-40">
            <option value="">{t("filters.allStatuses")}</option>
            {COLUMNS.map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
          </Select>
          <button type="submit" className={buttonVariants({ variant: "secondary" })}>
            {t("filters.apply")}
          </button>
          <div className="ml-auto inline-flex gap-0.5 rounded-sm border border-border bg-muted p-[3px]">
            {(["kanban", "list"] as const).map((v) => (
              <Link
                key={v}
                href={{ pathname: "/admin/clips", query: query({ view: v }) }}
                className={cn("inline-flex min-h-[34px] items-center rounded-xs px-3 text-[13px] font-semibold no-underline", view === v ? "bg-card text-primary shadow-1" : "text-muted-foreground")}
              >
                {t(`views.${v}`)}
              </Link>
            ))}
          </div>
        </form>

        {view === "kanban" ? (
          <div className="flex items-start gap-3.5 overflow-x-auto pb-2" data-testid="kanban">
            {COLUMNS.filter((s) => !status || s === status).map((s) => {
              const items = clips.filter((c) => c.status === s);
              return (
                <section key={s} aria-label={ts(s)} className="flex w-[272px] shrink-0 flex-col gap-2 rounded-lg bg-muted p-2.5">
                  <header className="flex items-center justify-between px-1 pb-1">
                    <StatusBadge type="clip" value={s} />
                    <span className="text-xs font-semibold text-subtle-foreground">{items.length}</span>
                  </header>
                  {items.map((c) => (
                    <article key={c.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 shadow-1">
                      <Link href={`/admin/clips/${c.id}`} className="text-sm font-semibold leading-snug text-inherit no-underline hover:underline">
                        {c.title}
                      </Link>
                      <p className="flex items-center justify-between gap-2 text-xs text-subtle-foreground">
                        <span className="truncate">{c.client?.creator_name}</span>
                        {c.account ? <PlatformBadge platform={c.account.platform} /> : null}
                      </p>
                      <p className="text-xs text-subtle-foreground">
                        {c.clipper?.full_name ?? t("unassigned")} {c.due_at ? `· ${formatDateTime(c.due_at, locale)}` : ""}
                      </p>
                      <ClipStatusSelect clipId={c.id} status={c.status} label={t("changeStatus", { title: c.title })} />
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
        ) : (
          <Card className="p-0 md:p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-sage-50 text-left text-xs uppercase tracking-[0.04em] text-subtle-foreground">
                    <th className="px-4 py-3 font-semibold">{t("cols.clip")}</th>
                    <th className="px-4 py-3 font-semibold">{t("cols.client")}</th>
                    <th className="px-4 py-3 font-semibold">{t("cols.clipper")}</th>
                    <th className="px-4 py-3 font-semibold">{t("cols.due")}</th>
                    <th className="px-4 py-3 font-semibold">{t("cols.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {clips.map((c) => (
                    <tr key={c.id} className="border-b border-sage-100 last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/admin/clips/${c.id}`} className="font-semibold">
                          {c.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{c.client?.creator_name}</td>
                      <td className="px-4 py-3">{c.clipper?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(c.due_at, locale)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge type="clip" value={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clips.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p> : null}
            </div>
          </Card>
        )}
      </PageBody>
    </>
  );
}
