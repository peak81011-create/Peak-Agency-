import { expect, test } from "@playwright/test";
import * as OTPAuth from "otpauth";
import { DEMO_USERS, adminClient, expectPath, login } from "./helpers";

test.describe("Fondations", () => {
  test("l'accueil s'affiche en français et en anglais, avec le sélecteur de langue", async ({ page }) => {
    await page.goto("/");
    await expectPath(page, /\/fr$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vos lives");
    await page.getByRole("group", { name: "Langue" }).first().getByRole("link", { name: "EN" }).click();
    await expectPath(page, /\/en$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your streams");
  });

  test("un visiteur est renvoyé vers la connexion depuis un espace privé", async ({ page }) => {
    await page.goto("/fr/app");
    await expectPath(page, /\/fr\/login\?next=%2Ffr%2Fapp/);
  });

  test("mauvais mot de passe : message clair", async ({ page }) => {
    await login(page, DEMO_USERS.clientActive.email, "Mauvais-mot-de-passe-1!");
    // (Next.js ajoute son propre role="alert" pour les annonces de navigation)
    await expect(page.getByRole("alert").filter({ hasText: "E-mail ou mot de passe incorrect" })).toBeVisible();
  });

  test("un client actif voit son espace débloqué", async ({ page }) => {
    await login(page, DEMO_USERS.clientActive.email);
    await expectPath(page, /\/fr\/app$/);
    await expect(page.getByText("Actif", { exact: true })).toBeVisible();
    await expect(page.getByText("Votre espace sera débloqué")).toHaveCount(0);
  });

  test("un client qui n'a pas payé voit son espace verrouillé", async ({ page }) => {
    await login(page, DEMO_USERS.clientNew.email);
    await expectPath(page, /\/fr\/app$/);
    await expect(page.getByText("Votre espace sera débloqué après validation du paiement")).toBeVisible();
  });

  test("un client ne peut pas ouvrir l'espace admin", async ({ page }) => {
    await login(page, DEMO_USERS.clientActive.email);
    await expectPath(page, /\/fr\/app$/);
    await page.goto("/fr/admin");
    await expectPath(page, /\/fr\/app$/);
  });

  test("le monteur a ses permissions par défaut, sans la validation des paiements", async ({ page }) => {
    await login(page, DEMO_USERS.editor.email);
    await expectPath(page, /\/fr\/admin$/);
    const list = page.getByTestId("permission-list");
    await expect(list).toContainText("clips.create");
    await expect(list).not.toContainText("payments.validate");
  });

  test("l'owner doit activer la double authentification avant d'accéder à l'admin", async ({ page }) => {
    // Repart d'un owner sans 2FA (le test peut être relancé)
    const admin = adminClient();
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const owner = users.users.find((u) => u.email === DEMO_USERS.owner.email);
    if (owner) {
      const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: owner.id });
      for (const factor of factors?.factors ?? []) await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: owner.id });
    }

    await login(page, DEMO_USERS.owner.email);
    await expectPath(page, /\/fr\/mfa/);
    await expect(page.getByRole("heading", { name: "Activez la double authentification" })).toBeVisible();

    // Accès direct à l'admin refusé tant que la 2FA n'est pas validée
    await page.goto("/fr/admin");
    await expectPath(page, /\/fr\/mfa/);

    const secret = (await page.locator("code").textContent())?.trim() ?? "";
    expect(secret.length).toBeGreaterThan(10);
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) });
    await page.getByLabel("Code à 6 chiffres").fill(totp.generate());
    await page.getByRole("button", { name: "Vérifier" }).click();
    await expectPath(page, /\/fr\/admin$/);
    await expect(page.getByTestId("permission-list")).toContainText("payments.validate");
  });

  test("inscription : le créateur est invité à confirmer son e-mail", async ({ page }) => {
    const email = `e2e+${Date.now()}@demo.peak.local`;
    await page.goto("/fr/signup");
    await page.getByLabel("Nom complet").fill("Test E2E");
    await page.getByLabel("Nom de créateur").fill("E2E Live");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("Peak-Agency-2026!");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expectPath(page, /\/fr\/check-email$/);
    await expect(page.getByRole("heading", { name: "Vérifiez votre boîte mail" })).toBeVisible();
  });
});
