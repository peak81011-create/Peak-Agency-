import { defineRouting } from "next-intl/routing";

// Pour ajouter une langue : l'ajouter ici + créer messages/<code>.json (voir README).
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
