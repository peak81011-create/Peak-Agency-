import { MailCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { initPageLocale } from "@/i18n/page";
import { AuthCard } from "@/features/auth/components/auth-card";
import { Link } from "@/i18n/navigation";

export default async function CheckEmailPage({ params }: { params: Promise<{ locale: string }> }) {
  await initPageLocale(params);
  const t = await getTranslations("auth");
  return (
    <AuthCard eyebrow={t("checkEmail.eyebrow")} title={t("checkEmail.title")} lead={t("checkEmail.lead")}>
      <MailCheck className="size-10 text-forest-600" aria-hidden />
      <Link href="/login" className="text-[13px] font-semibold text-forest-700">
        {t("backToLogin")}
      </Link>
    </AuthCard>
  );
}
