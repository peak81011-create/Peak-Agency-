import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initPageLocale } from "@/i18n/page";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("eyebrow") };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  await initPageLocale(params);
  const { next, error } = await searchParams;
  const t = await getTranslations("auth.login");
  return (
    <AuthCard eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <LoginForm next={next} initialError={error === "link" ? "linkInvalid" : undefined} />
    </AuthCard>
  );
}
