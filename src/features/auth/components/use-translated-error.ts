"use client";

import { useTranslations } from "next-intl";

/** Traduit une clé d'erreur renvoyée par une action ou un schéma zod. */
export function useErrorText() {
  const tValidation = useTranslations("validation");
  const tAuth = useTranslations("auth.errors");
  return (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    if (tValidation.has(key as never)) return tValidation(key as never);
    if (tAuth.has(key as never)) return tAuth(key as never);
    return tAuth("generic");
  };
}
