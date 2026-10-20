import { getTranslations } from "next-intl/server";
import { Stepper } from "@/components/ui/stepper";
import type { OnboardingStep } from "../status";

const ORDER: OnboardingStep[] = ["profile", "plan", "payment"];

export async function OnboardingSteps({ current }: { current: OnboardingStep }) {
  const t = await getTranslations("client.onboarding");
  return <Stepper steps={ORDER.map((s) => t(`steps.${s}`))} current={ORDER.indexOf(current)} />;
}
