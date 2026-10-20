import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl font-bold [font-stretch:110%]">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("notFoundLead")}</p>
      <Link href="/" className={buttonVariants()}>
        {t("backHome")}
      </Link>
    </main>
  );
}
