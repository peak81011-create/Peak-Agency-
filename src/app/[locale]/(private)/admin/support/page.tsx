import { nowMs } from "@/lib/time";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { ContactHandledButton } from "@/features/support/components/contact-handled-button";
import { isOverdue, listTickets } from "@/features/support/queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { can, requirePermission } from "@/lib/auth/session";
import { getCommitments } from "@/lib/commitments";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ALL_TICKET_CATEGORIES, TICKET_STATUSES, parseDurationHours } from "@/lib/validation/support";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.support");
  return { title: t("title") };
}

type Params = { tab?: string; audience?: string; category?: string; status?: string; assigned?: string };

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requirePermission("support.manage");
  const params = await searchParams;
  const tab = params.tab === "contact" ? "contact" : "tickets";
  const [t, ts, tc, locale, commitments] = await Promise.all([
    getTranslations("admin.support"),
    getTranslations("status.ticket"),
    getTranslations("support.categories"),
    getLocale() as Promise<Locale>,
    getCommitments(),
  ]);
  const sla = parseDurationHours(commitments.delai_reponse);
  const canContact = await can(user, "requests.manage");

  const tabs = (
    <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label={t("title")}>
      {(canContact ? (["tickets", "contact"] as const) : (["tickets"] as const)).map((key) => (
        <Link
          key={key}
          href={{ pathname: "/admin/support", query: { tab: key } }}
          aria-current={key === tab ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium no-underline",
            key === tab ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground",
          )}
        >
          {t(`tabs.${key}`)}
        </Link>
      ))}
    </nav>
  );

  if (tab === "contact" && canContact) {
    const supabase = await createSupabaseServerClient();
    const { data: messages } = await supabase.from("contact_messages").select("*").order("handled").order("created_at", { ascending: false }).limit(200);
    return (
      <>
        <PageHeader title={t("title")} />
        <PageBody>
          {tabs}
          {!messages?.length ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : null}
          <div className="grid gap-3">
            {(messages ?? []).map((m) => (
              <Card key={m.id} className={cn("flex flex-col gap-2", m.handled && "opacity-60")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a>
                  </p>
                  <ContactHandledButton id={m.id} handled={m.handled} />
                </div>
                <p className="text-xs text-subtle-foreground">{formatDateTime(m.created_at, locale)}</p>
                <p className="whitespace-pre-line text-sm">{m.message}</p>
              </Card>
            ))}
          </div>
        </PageBody>
      </>
    );
  }

  const assigned = params.assigned === "me" ? user.id : params.assigned === "none" ? null : undefined;
  const tickets = await listTickets({
    audience: params.audience || undefined,
    category: params.category || undefined,
    status: params.status ?? "open",
    assignedTo: assigned,
  });
  const now = nowMs();
  const rows = tickets
    .map((tk) => ({ ...tk, late: isOverdue(tk, sla, now) }))
    .sort((a, b) => Number(b.late) - Number(a.late));

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <Link href="/admin/support/replies" className={buttonVariants({ variant: "secondary" })}>
            {t("savedReplies")}
          </Link>
        }
      />
      <PageBody>
        {tabs}
        <form className="flex flex-wrap items-end gap-2" method="get">
          <Select name="audience" defaultValue={params.audience ?? ""} aria-label={t("filters.audience")} className="w-auto">
            <option value="">{t("filters.allAudiences")}</option>
            {(["createur", "clipper", "equipe"] as const).map((a) => (
              <option key={a} value={a}>
                {t(`audiences.${a}`)}
              </option>
            ))}
          </Select>
          <Select name="category" defaultValue={params.category ?? ""} aria-label={t("filters.category")} className="w-auto">
            <option value="">{t("filters.allCategories")}</option>
            {ALL_TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tc(c)}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? "open"} aria-label={t("filters.status")} className="w-auto">
            <option value="open">{t("filters.open")}</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
          </Select>
          <Select name="assigned" defaultValue={params.assigned ?? ""} aria-label={t("filters.assigned")} className="w-auto">
            <option value="">{t("filters.anyone")}</option>
            <option value="me">{t("filters.me")}</option>
            <option value="none">{t("filters.unassigned")}</option>
          </Select>
          <button type="submit" className={buttonVariants({ variant: "secondary" })}>
            {t("filters.apply")}
          </button>
        </form>
        {sla === null ? <p className="text-xs text-subtle-foreground">{t("noSla")}</p> : null}
        <Card className="p-0 md:p-0">
          {rows.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p> : null}
          <ul className="divide-y divide-border" data-testid="support-inbox">
            {rows.map((tk) => (
              <li key={tk.id}>
                <Link
                  href={`/admin/support/${tk.id}`}
                  className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-inherit no-underline hover:bg-paper", tk.late && "bg-t-red-bg/60")}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {tk.late ? <span className="mr-2 text-t-red-fg">●</span> : null}
                      {tk.subject}
                    </span>
                    <span className="text-xs text-subtle-foreground">
                      #{tk.number} · {tk.author?.full_name || tk.author?.email} · {t(`audiences.${tk.audience}`)} · {tc(tk.category as never)} ·{" "}
                      {formatDateTime(tk.created_at, locale)}
                      {tk.assignee ? ` · ${tk.assignee.full_name}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {tk.late ? <Badge tone="red">{t("late")}</Badge> : null}
                    <StatusBadge type="ticket" value={tk.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </PageBody>
    </>
  );
}
