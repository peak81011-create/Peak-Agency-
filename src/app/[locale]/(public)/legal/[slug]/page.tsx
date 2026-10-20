import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Section } from "@/features/public/sections";
import { Link } from "@/i18n/navigation";
import { initPageLocale } from "@/i18n/page";
import { getContent } from "@/lib/content/site-content";
import { RichText } from "@/lib/content/rich-text";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const SLUGS = { notice: "legal.notice", terms: "legal.terms", privacy: "legal.privacy" } as const;
type Slug = keyof typeof SLUGS;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!(slug in SLUGS)) return {};
  const t = await getTranslations("legal");
  return { title: t(`titles.${slug as Slug}`) };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const locale = await initPageLocale(params);
  const { slug } = await params;
  if (!(slug in SLUGS)) notFound();
  const key = SLUGS[slug as Slug];
  const [t, c] = await Promise.all([getTranslations("legal"), getContent([key], locale)]);
  // Les informations de l'entreprise viennent des paramètres ; un champ vide
  // reste signalé « à compléter » (rien n'est inventé).
  const company = slug === "notice" ? await getSettings("company") : null;
  const missing = t("missing");

  return (
    <Section>
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={t("nav")} className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
          {(Object.keys(SLUGS) as Slug[]).map((s) => (
            <Link
              key={s}
              href={`/legal/${s}`}
              aria-current={s === slug ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-l-2 px-3 py-2 text-sm no-underline",
                s === slug ? "border-primary font-semibold text-primary" : "border-border text-muted-foreground",
              )}
            >
              {t(`titles.${s}`)}
            </Link>
          ))}
        </nav>
        <article className="flex flex-col gap-6">
          <h1 className="font-display text-[34px] font-extrabold leading-tight md:text-[44px] [font-stretch:115%]">{t(`titles.${slug as Slug}`)}</h1>
          {company ? (
            <Card>
              <dl className="grid grid-cols-1 gap-x-5 gap-y-1 text-sm md:grid-cols-[minmax(180px,auto)_1fr] md:gap-y-2.5">
                {(["legal_name", "legal_form", "address", "siret", "vat_number", "email", "phone", "publication_director", "host"] as const).map((f) => (
                  <div key={f} className="contents">
                    <dt className="text-subtle-foreground">{t(`company.${f}`)}</dt>
                    <dd className={cn("mb-2 whitespace-pre-line font-medium md:mb-0", !company[f] && "text-t-amber-fg")}>
                      {company[f] || missing}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}
          <RichText text={c[key] ?? ""} />
        </article>
      </div>
    </Section>
  );
}
