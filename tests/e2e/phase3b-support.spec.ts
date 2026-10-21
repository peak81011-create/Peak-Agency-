import { expect, test } from "@playwright/test";
import { DEMO_USERS, adminClient, login } from "./helpers";

// Service client : un créateur tape « virement », des questions de la FAQ lui
// sont suggérées ; il crée quand même un ticket, l'assistante répond, il note.

const admin = adminClient();

test.describe.configure({ mode: "serial", timeout: 90_000 });

test.beforeAll(async () => {
  // Les réponses de la FAQ liées au paiement utilisent ces variables.
  await admin.from("settings").upsert({
    key: "commitments",
    value: { delai_reponse: "24 h", delai_activation: "24 h", delai_premiers_clips: "", conditions_resiliation: "", minimum_par_clip: null, tarif_1000_vues: null, jours_comptage_vues: null, plafond_par_clip: null, jour_paiement: null, clip_test_remunere: "", age_minimum: 18 },
  });
});

test.afterAll(async () => {
  await admin.from("settings").update({ value: { delai_reponse: "", delai_activation: "", delai_premiers_clips: "", conditions_resiliation: "", minimum_par_clip: null, tarif_1000_vues: null, jours_comptage_vues: null, plafond_par_clip: null, jour_paiement: null, clip_test_remunere: "", age_minimum: 18 } }).eq("key", "commitments");
});

test("ticket : suggestions de la FAQ, réponse de l'assistante, note du créateur", async ({ browser, page }) => {
  const subject = `Virement e2e ${Date.now()}`;
  await login(page, DEMO_USERS.clientActive.email);
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto("/fr/support/new");
  await page.getByLabel("Titre").fill(subject);
  await expect(page.getByTestId("faq-suggestions")).toContainText("Comment je paie ?");
  await page.getByLabel("Sujet").selectOption("paiement");
  await page.getByLabel("Votre message").fill("Bonjour, j'ai fait mon virement hier, pouvez-vous vérifier ?");
  await expect(page.getByText("On vous répond sous 24 h.")).toBeVisible();
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page).toHaveURL(/\/fr\/support\/[0-9a-f-]{36}$/);
  const ticketUrl = page.url();

  // L'assistante répond depuis le service client (note interne + réponse)
  const assistant = await (await browser.newContext({ locale: "fr-FR" })).newPage();
  await login(assistant, DEMO_USERS.assistant.email);
  await expect(assistant).not.toHaveURL(/\/login/);
  await assistant.goto("/fr/admin/support");
  await assistant.getByTestId("support-inbox").getByText(subject).click();
  await assistant.getByLabel("Votre réponse").fill("Note interne e2e");
  await assistant.getByLabel("Note interne (invisible pour l'utilisateur)").check();
  await assistant.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(assistant.getByTestId("ticket-thread")).toContainText("Note interne e2e");
  await assistant.getByLabel("Votre réponse").fill("Bien reçu, votre virement est en cours de vérification.");
  await assistant.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(assistant.getByTestId("ticket-thread")).toContainText("Bien reçu");

  // Le créateur voit la réponse (pas la note interne), règle et note
  await page.goto(ticketUrl);
  await expect(page.getByTestId("ticket-thread")).toContainText("Bien reçu");
  await expect(page.getByText("Note interne e2e")).toHaveCount(0);
  await expect(page.getByText("En attente de votre réponse")).toBeVisible();
  await page.getByRole("button", { name: "Mon problème est réglé" }).click();
  await page.getByRole("radio", { name: "5 étoiles" }).click();
  await page.getByRole("button", { name: "Envoyer ma note" }).click();
  await expect(page.getByText("Merci pour votre note.")).toBeVisible();
  const { data } = await admin.from("support_tickets").select("status, satisfaction, first_response_at").eq("subject", subject).single();
  expect(data?.status).toBe("resolu");
  expect(data?.satisfaction).toBe(5);
  expect(data?.first_response_at).not.toBeNull();
});
