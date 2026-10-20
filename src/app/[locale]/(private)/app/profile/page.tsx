import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { CreatorProfileForm } from "@/features/client/components/creator-profile-form";
import { OnboardingSteps } from "@/features/client/components/onboarding-header";
import { getClientDetail } from "@/features/client/queries";
import { isUnlocked } from "@/features/client/status";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { requireUser } from "@/lib/auth/session";
import { CHANNEL_KEYS, CONTENT_LANGUAGES, NICHES, type CreatorProfileInput } from "@/lib/validation/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("client.profile");
  return { title: t("title") };
}

export default async function CreatorProfilePage() {
  const user = await requireUser();
  const client = (await getClientDetail(user.client!.id))!;
  const t = await getTranslations("client.profile");
  const onboarding = !user.client!.profileCompleted;

  const defaults: CreatorProfileInput = {
    creatorName: client.creator_name,
    niche: (NICHES as readonly string[]).includes(client.niche ?? "") ? (client.niche as CreatorProfileInput["niche"]) : "gaming",
    language: (CONTENT_LANGUAGES as readonly string[]).includes(client.language ?? "")
      ? (client.language as CreatorProfileInput["language"])
      : "fr",
    channels: Object.fromEntries(CHANNEL_KEYS.map((k) => [k, client.channels?.[k] ?? ""])) as CreatorProfileInput["channels"],
    goals: client.goals ?? "",
    liveAvailability: client.live_availability ?? "",
    billingAddress: client.billing_address ?? "",
  };

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <PageBody>
        {!isUnlocked(user.client!.status) ? <OnboardingSteps current="profile" /> : null}
        <p className="text-muted-foreground">{t("lead")}</p>
        <Card>
          <CreatorProfileForm defaults={defaults} onboarding={onboarding} />
        </Card>
      </PageBody>
    </>
  );
}
