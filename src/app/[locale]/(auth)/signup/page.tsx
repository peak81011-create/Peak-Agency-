import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initPageLocale } from "@/i18n/page";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return { title: t("eyebrow") };
}

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  await initPageLocale(params);
  const { plan } = await searchParams;
  const t = await getTranslations("auth.signup");
  return (
    <AuthCard eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <SignupForm intendedPlan={plan} />
    </AuthCard>
  );
}
