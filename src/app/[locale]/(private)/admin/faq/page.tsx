import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FaqItemForm } from "@/features/admin/faq/faq-item-form";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { requirePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FAQ_AUDIENCES } from "@/lib/validation/faq";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.faq");
  return { title: t("title") };
}

export default async function AdminFaqPage() {
  await requirePermission("content.update");
  const t = await getTranslations("admin.faq");
  const supabase = await createSupabaseServerClient();
  const [{ data: items }, { data: votes }] = await Promise.all([
    supabase.from("faq_items").select("*").order("audience").order("sort_order"),
    supabase.from("faq_feedback").select("faq_id, helpful"),
  ]);
  const tally = new Map<string, { yes: number; no: number }>();
  for (const v of votes ?? []) {
    const cur = tally.get(v.faq_id) ?? { yes: 0, no: 0 };
    if (v.helpful) cur.yes++;
    else cur.no++;
    tally.set(v.faq_id, cur);
  }

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("lead")}</p>
        <Card>
          <CardHeader>
            <CardTitle>{t("new")}</CardTitle>
          </CardHeader>
          <FaqItemForm
            id={null}
            defaults={{ audience: "createur", questionFr: "", answerFr: "", questionEn: "", answerEn: "", sortOrder: "200", isVisible: true, isTop: false }}
          />
        </Card>
        {FAQ_AUDIENCES.map((audience) => {
          const list = (items ?? []).filter((i) => i.audience === audience);
          if (!list.length) return null;
          return (
            <section key={audience} className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-bold [font-stretch:108%]">{t(`audiences.${audience}`)}</h2>
              {list.map((i) => {
                const v = tally.get(i.id);
                return (
                  <details key={i.id} className="group rounded-lg border border-border bg-card">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
                      <span className="font-semibold">{i.question_fr}</span>
                      <span className="flex flex-wrap gap-2">
                        {!i.is_visible ? <Badge tone="neutral">{t("hidden")}</Badge> : null}
                        {i.is_top ? <Badge tone="blue">{t("topBadge")}</Badge> : null}
                        {v ? <Badge tone={v.no > v.yes ? "red" : "green"}>{t("votes", { yes: v.yes, no: v.no })}</Badge> : null}
                      </span>
                    </summary>
                    <div className="border-t border-border p-5">
                      <FaqItemForm
                        id={i.id}
                        defaults={{
                          audience: i.audience,
                          questionFr: i.question_fr,
                          answerFr: i.answer_fr,
                          questionEn: i.question_en,
                          answerEn: i.answer_en,
                          sortOrder: String(i.sort_order),
                          isVisible: i.is_visible,
                          isTop: i.is_top,
                        }}
                      />
                    </div>
                  </details>
                );
              })}
            </section>
          );
        })}
      </PageBody>
    </>
  );
}
