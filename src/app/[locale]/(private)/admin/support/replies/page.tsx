import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { SavedReplyForm } from "@/features/support/components/saved-reply-form";
import { listSavedReplies } from "@/features/support/queries";
import { requirePermission } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.support.replies");
  return { title: t("title") };
}

export default async function SavedRepliesPage() {
  await requirePermission("support.manage");
  const [t, replies] = await Promise.all([getTranslations("admin.support.replies"), listSavedReplies()]);
  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("lead")}</p>
        <Card>
          <CardHeader>
            <CardTitle>{t("new")}</CardTitle>
          </CardHeader>
          <SavedReplyForm id={null} defaults={{ title: "", bodyFr: "", bodyEn: "" }} />
        </Card>
        {replies.map((r) => (
          <Card key={r.id}>
            <SavedReplyForm id={r.id} defaults={{ title: r.title, bodyFr: r.body_fr, bodyEn: r.body_en }} />
          </Card>
        ))}
      </PageBody>
    </>
  );
}
