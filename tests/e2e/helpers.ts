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

/**
 * Connexion de l'owner avec double authentification : repart d'un compte sans
 * facteur (supprimé via l'API admin), enrôle un TOTP et valide le code.
 */
export async function loginAsOwner(page: Page) {
  const OTPAuth = await import("otpauth");
  const admin = adminClient();
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const owner = users.users.find((u) => u.email === DEMO_USERS.owner.email);
  if (owner) {
    const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: owner.id });
    for (const factor of factors?.factors ?? []) await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: owner.id });
  }
  await login(page, DEMO_USERS.owner.email);
  await expect(page).toHaveURL(/\/fr\/mfa/);
  const secret = ((await page.locator("code").textContent()) ?? "").trim();
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) });
  await page.getByLabel("Code à 6 chiffres").fill(totp.generate());
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/\/fr\/admin$/);
}

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** Lien de confirmation reçu dans la boîte mail locale de Supabase (Mailpit). */
export async function confirmationLink(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    if (messages?.length) {
      const msg = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)).json()) as { HTML: string };
      const href = msg.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1];
      if (href) return href.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Aucun e-mail de confirmation pour ${email}`);
}

/** Petite image PNG valide (1 × 1 pixel) pour simuler une capture de virement. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
