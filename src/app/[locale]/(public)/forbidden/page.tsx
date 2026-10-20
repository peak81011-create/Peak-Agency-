import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function ForbiddenPage() {
  const t = await getTranslations("errors");
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold [font-stretch:110%]">{t("forbiddenTitle")}</h1>
      <p className="text-muted-foreground">{t("forbiddenLead")}</p>
      <Link href="/" className={buttonVariants()}>
        {t("backHome")}
      </Link>
    </div>
  );
}
