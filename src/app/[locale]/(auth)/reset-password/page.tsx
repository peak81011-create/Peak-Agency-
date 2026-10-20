import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initPageLocale } from "@/i18n/page";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetForm } from "@/features/auth/components/reset-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("eyebrow") };
}

// Atteinte via le lien de l'e-mail (session de récupération ouverte par /auth/confirm).
export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  await initPageLocale(params);
  const t = await getTranslations("auth.reset");
  return (
    <AuthCard eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <ResetForm />
    </AuthCard>
  );
}
