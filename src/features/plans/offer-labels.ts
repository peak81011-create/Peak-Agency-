import "server-only";
import { getTranslations } from "next-intl/server";

/** Libellés des bulles d'offres (traduits côté serveur). */
export async function offerLabels() {
  const t = await getTranslations("offers");
  return {
    featured: t("featured"),
    perClip: (value: string) => t("perClip", { value }),
    clipsPerMonth: (n: number) => t("clipsPerMonth", { n }),
    perDay: (n: number) => t("perDay", { n }),
    accounts: (n: number) => t("accounts", { n }),
    delivery: (n: number) => t("delivery", { n }),
    details: t("details"),
    calc: (clips: number, unit: string, total: string) => t("calc", { clips, unit, total }),
  };
}
