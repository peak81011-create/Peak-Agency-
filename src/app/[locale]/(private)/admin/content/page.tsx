import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentEditor } from "@/features/admin/content/content-editor";
import { ALL_CONTENT_KEYS, CONTENT_GROUPS, type ContentGroup } from "@/features/admin/content/fields";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.content");
  return { title: t("title") };
}

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  await requirePermission("content.update");
  const t = await getTranslations("admin.content");
  const { group: rawGroup } = await searchParams;
  const group: ContentGroup = rawGroup && rawGroup in CONTENT_GROUPS ? (rawGroup as ContentGroup) : "home";

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("site_content").select("key, value_fr, value_en").in("key", ALL_CONTENT_KEYS as string[]);
  const byKey = new Map((data ?? []).map((r) => [r.key, r]));

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <p className="text-muted-foreground">{t("lead")}</p>
        <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label={t("title")}>
          {(Object.keys(CONTENT_GROUPS) as ContentGroup[]).map((g) => (
            <Link
              key={g}
              href={{ pathname: "/admin/content", query: { group: g } }}
              aria-current={g === group ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium no-underline",
                g === group ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-primary",
              )}
            >
              {t(`groups.${g}`)}
            </Link>
          ))}
        </nav>
        {CONTENT_GROUPS[group].map((key) => {
          const row = byKey.get(key);
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{t(`keys.${key.replace(/\./g, "_")}` as never)}</CardTitle>
              </CardHeader>
              <ContentEditor contentKey={key} valueFr={row?.value_fr ?? ""} valueEn={row?.value_en ?? ""} />
            </Card>
          );
        })}
      </PageBody>
    </>
  );
}
