import { nowMs } from "@/lib/time";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { TicketReplyForm } from "@/features/support/components/ticket-reply-form";
import { TicketThread } from "@/features/support/components/ticket-thread";
import { TicketUserActions } from "@/features/support/components/ticket-user-actions";
import { getTicket, listTicketMessages } from "@/features/support/queries";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { commitmentVars, getCommitments } from "@/lib/commitments";
import { fillVars } from "@/lib/content/vars";
import { formatDateTime } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("support");
  return { title: t("title") };
}

const REOPEN_DAYS = 7;

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const ticket = await getTicket(id);
  if (!ticket || ticket.author_id !== user.id) notFound();
  const locale = (await getLocale()) as Locale;
  const [t, tc, messages, commitments] = await Promise.all([
    getTranslations("support"),
    getTranslations("support.categories"),
    listTicketMessages(id),
    getCommitments(),
  ]);
  const responseLine = fillVars(t.raw("response") as string, commitmentVars(commitments, locale));
  const canReopen = ticket.status === "resolu" && !!ticket.resolved_at && nowMs() - new Date(ticket.resolved_at).getTime() < REOPEN_DAYS * 86_400_000;

  return (
    <>
      <PageHeader eyebrow={`#${ticket.number} · ${tc(ticket.category as never)} · ${formatDateTime(ticket.created_at, locale)}`} title={ticket.subject} actions={<StatusBadge type="ticket" value={ticket.status} />} />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
          <Card className="flex flex-col gap-5">
            <TicketThread messages={messages} viewerId={user.id} />
            {ticket.status !== "resolu" ? (
              <>
                {responseLine ? <p className="text-sm text-forest-700">{responseLine}</p> : null}
                <TicketReplyForm ticketId={ticket.id} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{canReopen ? t("resolvedReopen") : t("resolvedNew")}</p>
            )}
          </Card>
          <Card>
            <TicketUserActions ticketId={ticket.id} status={ticket.status} canReopen={canReopen} rated={ticket.satisfaction !== null} />
          </Card>
        </div>
      </PageBody>
    </>
  );
}
