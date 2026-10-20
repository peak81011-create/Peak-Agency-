import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CommentThread } from "@/features/agency/components/comment-thread";
import { getRequest } from "@/features/agency/queries";
import { CloseRequestButton } from "@/features/client/components/close-request-button";
import { requireUnlockedClient } from "@/features/client/guard";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { formatDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("requests");
  return { title: t("clientTitle") };
}

export default async function ClientRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { user, writable } = await requireUnlockedClient();
  const request = await getRequest(id);
  if (!request) notFound();
  const [t, tt, locale] = await Promise.all([getTranslations("requests"), getTranslations("requests.types"), getLocale()]);
  const open = request.status === "nouvelle" || request.status === "en_cours";

  return (
    <>
      <PageHeader
        eyebrow={`#R-${request.number} · ${tt(request.type)} · ${formatDate(request.created_at, locale)}`}
        title={request.title}
        actions={<StatusBadge type="request" value={request.status} />}
      />
      <PageBody>
        <Card>
          <p className="whitespace-pre-line text-sm">{request.description}</p>
          {request.assignee ? <p className="mt-3 text-xs text-subtle-foreground">{t("followedBy", { name: request.assignee.full_name })}</p> : null}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("conversation")}</CardTitle>
            {open ? <CloseRequestButton requestId={request.id} /> : null}
          </CardHeader>
          <CommentThread entityType="request" entityId={request.id} viewerId={user.id} disabled={!writable} />
        </Card>
      </PageBody>
    </>
  );
}
