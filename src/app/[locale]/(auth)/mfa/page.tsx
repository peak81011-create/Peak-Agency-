import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initPageLocale } from "@/i18n/page";
import { AuthCard } from "@/features/auth/components/auth-card";
import { MfaForm } from "@/features/auth/components/mfa-form";
import { redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.mfa");
  return { title: t("eyebrow") };
}

export default async function MfaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const locale = await initPageLocale(params);
  const { next } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect({ href: "/login", locale });

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerifiedFactor = (factors?.totp ?? []).some((f) => f.status === "verified");
  const mode = hasVerifiedFactor ? "challenge" : "enroll";
  const t = await getTranslations("auth.mfa");

  return (
    <AuthCard
      eyebrow={t("eyebrow")}
      title={mode === "enroll" ? t("enrollTitle") : t("challengeTitle")}
      lead={mode === "enroll" ? t("enrollLead") : t("challengeLead")}
    >
      <MfaForm mode={mode} next={next} />
    </AuthCard>
  );
}
