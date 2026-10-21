import { nowMs } from "@/lib/time";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { staffOptions } from "@/features/admin/agency/queries";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { TicketManage } from "@/features/support/components/ticket-manage";
import { TicketReplyForm } from "@/features/support/components/ticket-reply-form";
import { TicketThread } from "@/features/support/components/ticket-thread";
import { getTicket, listSavedReplies, listTicketMessages } from "@/features/support/queries";
import type { Locale } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.support");
  return { title: t("title") };
}

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("support.manage");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const ticket = await getTicket(id);
  if (!ticket) notFound();
  const supabase = await createSupabaseServerClient();
  const [t, tc, tr, locale, messages, replies, staff, { data: author }] = await Promise.all([
    getTranslations("admin.support"),
    getTranslations("support.categories"),
    getTranslations("roles"),
    getLocale() as Promise<Locale>,
    listTicketMessages(id),
    listSavedReplies(),
    staffOptions(),
    supabase.from("profiles").select("locale").eq("id", ticket.author_id).maybeSingle(),
  ]);
  const elapsed = Math.round((nowMs() - new Date(ticket.created_at).getTime()) / 3_600_000);

  return (
    <>
      <PageHeader
        eyebrow={`#${ticket.number} · ${t(`audiences.${ticket.audience}`)} · ${tc(ticket.category as never)}`}
        title={ticket.subject}
        actions={<StatusBadge type="ticket" value={ticket.status} />}
      />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
          <Card className="flex flex-col gap-5">
            <TicketThread messages={messages} viewerId={user.id} />
            <TicketReplyForm ticketId={ticket.id} staff savedReplies={replies} authorLocale={author?.locale ?? "fr"} />
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("details")}</CardTitle>
              </CardHeader>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-subtle-foreground">{t("author")}</dt>
                <dd>{ticket.author?.full_name || ticket.author?.email}</dd>
                <dt className="text-subtle-foreground">{t("createdAt")}</dt>
                <dd>{formatDateTime(ticket.created_at, locale)}</dd>
                <dt className="text-subtle-foreground">{t("elapsed")}</dt>
                <dd>{t("hours", { n: elapsed })}</dd>
                <dt className="text-subtle-foreground">{t("firstResponse")}</dt>
                <dd>{ticket.first_response_at ? formatDateTime(ticket.first_response_at, locale) : "—"}</dd>
                {ticket.satisfaction ? (
                  <>
                    <dt className="text-subtle-foreground">{t("satisfaction")}</dt>
                    <dd>
                      {ticket.satisfaction}/5{ticket.satisfaction_comment ? ` · ${ticket.satisfaction_comment}` : ""}
                    </dd>
                  </>
                ) : null}
              </dl>
            </Card>
            <Card>
              <TicketManage
                ticketId={ticket.id}
                initial={{ status: ticket.status, priority: ticket.priority, assignedTo: ticket.assigned_to ?? "" }}
                staff={staff.map((s) => ({ id: s.id, label: `${s.full_name} · ${tr(s.role as "assistant")}` }))}
              />
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
