import { getTranslations } from "next-intl/server";
import { initPageLocale } from "@/i18n/page";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Accueil minimal de la phase 1 ; la vitrine complète arrive en phase 2.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  await initPageLocale(params);
  const t = await getTranslations("home");

  return (
    <section className="bg-forest-900 text-sage-100">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-16 md:px-8 md:py-24">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-sage-400 [font-stretch:112%]">
          {t("eyebrow")}
        </p>
        <h1 className="max-w-4xl text-balance font-display text-[42px] font-extrabold leading-[0.98] tracking-tight text-white md:text-6xl lg:text-[76px] [font-stretch:118%]">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-pretty text-[17px] text-sage-200 md:text-[19px]">{t("lead")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className={buttonVariants({ variant: "accent", size: "lg" })}>
            {t("ctaPrimary")}
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "on-dark", size: "lg" }))}>
            {t("ctaSecondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
