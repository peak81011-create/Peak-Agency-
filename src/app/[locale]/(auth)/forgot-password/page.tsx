import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initPageLocale } from "@/i18n/page";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotForm } from "@/features/auth/components/forgot-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("eyebrow") };
}

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  await initPageLocale(params);
  const t = await getTranslations("auth");
  return (
    <AuthCard eyebrow={t("forgot.eyebrow")} title={t("forgot.title")} lead={t("forgot.lead")}>
      <ForgotForm />
      <Link href="/login" className="inline-flex items-center gap-1 text-[13px] text-forest-700 no-underline">
        <ChevronLeft className="size-4" aria-hidden />
        {t("backToLogin")}
      </Link>
    </AuthCard>
  );
}
