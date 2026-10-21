import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD, DEMO_USERS, TINY_PNG, confirmationLink, expectPath, login, loginAsOwner } from "./helpers";

test.describe("Site public", () => {
  test("accueil et tarifs en français et en anglais", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vos lives");
    await expect(page.locator("#how")).toContainText("Envoi des vidéos");

    await page.goto("/fr/pricing");
    const plans = page.getByTestId("pricing-plans");
    await expect(plans.getByRole("article")).toHaveCount(3);
    await expect(plans).toContainText("Démo — Croissance");
    await expect(plans).toContainText("/ mois");

    await page.goto("/en/pricing");
    await expect(page.getByTestId("pricing-plans")).toContainText("Demo — Growth");
    await expect(page.getByTestId("pricing-plans")).toContainText("/ month");
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your streams");
  });

  test("les pages légales existent, avec les champs de l'entreprise à compléter", async ({ page }) => {
    await page.goto("/fr/legal/notice");
    await expect(page.getByRole("heading", { level: 1, name: "Mentions légales" })).toBeVisible();
    await expect(page.getByText("À compléter").first()).toBeVisible();
    await page.goto("/en/legal/terms");
    await expect(page.getByRole("heading", { level: 1, name: "Terms of sale" })).toBeVisible();
  });

  test("le formulaire de contact enregistre le message", async ({ page }) => {
    await page.goto("/fr/contact");
    await page.getByLabel("Nom", { exact: true }).fill("Visiteur E2E");
    await page.getByLabel("E-mail").fill("visiteur@demo.peak.local");
    await page.getByLabel("Message").fill("Bonjour, je voudrais en savoir plus sur vos offres.");
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText("Merci, votre message est bien envoyé.")).toBeVisible();
  });

  test("un clipper peut postuler depuis l'accueil", async ({ page }) => {
    await page.goto("/fr");
    await page.locator("#audiences").getByRole("link", { name: "Postuler" }).click();
    await expect(page).toHaveURL(/\/fr\/join$/);
    await page.getByLabel("Nom et prénom").fill("Clipper E2E");
    await page.getByLabel("E-mail").fill("clipper.e2e@demo.peak.local");
    await page.getByText("TikTok", { exact: true }).click();
    await page.getByLabel("Expérience en montage").selectOption("confirme");
    await page.getByLabel("Disponibilité par semaine").selectOption("10_20");
    await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
    await expect(page.getByText("Candidature envoyée")).toBeVisible();
  });
});

test.describe("Parcours de paiement par virement", () => {
  const email = `createur+${Date.now()}@demo.peak.local`;
  let reference = "";

  test("un créateur s'inscrit, choisit une offre, voit l'IBAN et sa référence, dépose une preuve ; l'espace reste verrouillé", async ({ page }) => {
    // Choix de l'offre depuis la vitrine
    await page.goto("/fr/pricing");
    await page.getByRole("article").filter({ hasText: "Démo — Croissance" }).getByRole("link", { name: "Choisir cette offre" }).click();
    await expectPath(page, /\/fr\/signup\?plan=/);

    await page.getByLabel("Nom complet").fill("Créateur E2E");
    await page.getByLabel("Nom de créateur").fill("E2E Live");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expectPath(page, /\/fr\/check-email$/);

    // Lien de vérification reçu par e-mail
    await page.goto(await confirmationLink(email));
    await expectPath(page, /\/fr\/app\/profile$/);

    await page.getByLabel("Twitch").fill("https://www.twitch.tv/e2e-live");
    await page.getByRole("button", { name: "Continuer" }).click();
    await expectPath(page, /\/fr\/app\/plan$/);
    await expect(page.getByRole("radio", { name: /Démo — Croissance/ })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Continuer vers le paiement" }).click();
    await expectPath(page, /\/fr\/app\/payment$/);

    await expect(page.getByTestId("payment-amount")).toContainText("890,00");
    await expect(page.getByTestId("bank-details")).toContainText("FR76 3000 6000 0112 3456 7890 189");
    reference = ((await page.getByTestId("payment-reference").textContent()) ?? "").trim();
    expect(reference).toMatch(/^PEAK-\d{4}-\d{4}$/);

    await page.getByTestId("proof-input").setInputFiles({ name: "virement.png", mimeType: "image/png", buffer: TINY_PNG });
    await expect(page.getByText("Preuve reçue, vérification en cours")).toBeVisible();

    // L'espace reste verrouillé
    await page.goto("/fr/app");
    await expect(page.getByText("Votre espace sera débloqué après validation du paiement")).toBeVisible();
    await page.goto("/fr/app/billing");
    await expectPath(page, /\/fr\/app$/);
  });

  test("l'owner valide le paiement : l'espace se débloque et la facture est générée", async ({ page, browser }) => {
    test.skip(!reference, "dépend du test précédent");
    await loginAsOwner(page);
    await page.goto("/fr/admin/payments");
    await page.getByTestId("payment-list").getByRole("link").filter({ hasText: reference }).click();
    const detail = page.getByTestId("payment-detail");
    await expect(detail).toContainText("Vérifiez votre compte bancaire avant de valider");
    await expect(detail).toContainText(reference);

    const validate = detail.getByRole("button", { name: "Valider le paiement" });
    await expect(validate).toBeDisabled();
    for (const check of await detail.getByRole("checkbox").all()) await check.check();
    await validate.click();
    await expect(detail.getByText("Validé", { exact: true })).toBeVisible();

    // Côté client : espace débloqué, facture disponible
    const clientContext = await browser.newContext();
    const client = await clientContext.newPage();
    await login(client, email);
    await expectPath(client, /\/fr\/app$/);
    await expect(client.getByText("Actif", { exact: true })).toBeVisible();
    await client.goto("/fr/app/billing");
    const invoiceLink = client.getByRole("link", { name: /^F-\d{4}-\d{4}$/ });
    await expect(invoiceLink).toBeVisible();
    const pdf = await client.request.get((await invoiceLink.getAttribute("href"))!);
    expect(pdf.ok()).toBe(true);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await clientContext.close();
  });

  test("un refus avec motif est visible par le client", async ({ page }) => {
    // Le client « à vérifier » du seed n'a pas déposé de fichier : l'owner peut quand même refuser.
    await loginAsOwner(page);
    await page.goto("/fr/admin/payments?tab=review");
    await page.getByTestId("payment-list").getByRole("link").filter({ hasText: "Hugo Gaming" }).click();
    const detail = page.getByTestId("payment-detail");
    await detail.getByRole("button", { name: "Refuser" }).click();
    await detail.getByRole("button", { name: "Refuser le paiement" }).click();
    await expect(detail.getByText("Refusé", { exact: true })).toBeVisible();
    await expect(detail).toContainText("Le montant reçu ne correspond pas");
  });

  test("le client voit le motif du refus et peut redéposer une preuve", async ({ page }) => {
    await login(page, DEMO_USERS.clientPending.email);
    await expectPath(page, /\/fr\/app\/payment$/);
    await expect(page.getByText("Votre preuve de paiement a été refusée")).toBeVisible();
    await expect(page.getByText("Le montant reçu ne correspond pas")).toBeVisible();
    await expect(page.getByTestId("proof-input")).toBeAttached();
  });
});
