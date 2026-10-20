import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { DEMO_PASSWORD_DEFAULT, DEMO_USERS } from "../../scripts/demo-accounts";

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? DEMO_PASSWORD_DEFAULT;
export { DEMO_USERS };

export async function login(page: Page, email: string, password = DEMO_PASSWORD, locale: "fr" | "en" = "fr") {
  await page.goto(`/${locale}/login`);
  await page.getByLabel(locale === "fr" ? "E-mail" : "Email").fill(email);
  await page.getByLabel(locale === "fr" ? "Mot de passe" : "Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: locale === "fr" ? "Se connecter" : "Log in" }).click();
}

export async function expectPath(page: Page, pattern: RegExp) {
  await expect(page).toHaveURL(pattern);
}

config({ path: ".env.local" });

/** Client service_role pour préparer l'état de la base dans les tests. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY manquants");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
