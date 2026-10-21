import { expect, test } from "@playwright/test";
import { adminClient, loginAsOwner } from "./helpers";

// Parcours publics « créateurs » et « clippers », FAQ, aide et variables
// « Textes & engagements » (un bloc dont la variable est vide est masqué).

const admin = adminClient();
const EMPTY = {
  delai_reponse: "",
  delai_activation: "",
  delai_premiers_clips: "",
  conditions_resiliation: "",
  minimum_par_clip: null,
  tarif_1000_vues: null,
  jours_comptage_vues: null,
  plafond_par_clip: null,
  jour_paiement: null,
  clip_test_remunere: "",
  age_minimum: 18,
};
const FILLED = { ...EMPTY, delai_reponse: "24 h", delai_activation: "24 h", minimum_par_clip: 300, tarif_1000_vues: 50, jours_comptage_vues: 7, jour_paiement: 5 };
const setCommitments = (value: object) => admin.from("settings").upsert({ key: "commitments", value });

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await setCommitments(EMPTY);
});

test("variables vides : les blocs qui les utilisent sont masqués, et la checklist admin les signale", async ({ page }) => {
  await setCommitments(EMPTY);
  await page.goto("/fr/clippers");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Monte des clips");
  await expect(page.getByTestId("pay-table")).toHaveCount(0);
  await expect(page.getByText("Un filet de sécurité")).toHaveCount(0);
  await expect(page.getByText(/On vous répond sous/)).toHaveCount(0);

  await loginAsOwner(page);
  const checklist = page.getByTestId("launch-checklist");
  await expect(checklist).toContainText("Minimum garanti par clip validé");
  await expect(checklist).toContainText("Délai de réponse du service client");
});

test("un visiteur choisit « Je suis clipper », utilise le simulateur et postule", async ({ page }) => {
  await setCommitments(FILLED);
  await page.goto("/fr");
  await page.getByTestId("door-clipper").click();
  await expect(page).toHaveURL(/\/fr\/clippers$/);
  await expect(page.getByTestId("pay-table")).toContainText("3,00");
  await expect(page.getByText("Un filet de sécurité")).toBeVisible();

  // 10 000 vues (position par défaut) : 3 € + 10 × 0,50 € = 8 €
  await expect(page.getByTestId("simulator-result")).toContainText("8,00");
  await page.getByRole("slider").press("End");
  await expect(page.getByTestId("simulator-views")).toContainText("1 000 000");
  await expect(page.getByTestId("simulator-result")).toContainText("503,00");

  await page.getByRole("link", { name: "Postuler maintenant" }).click();
  await expect(page).toHaveURL(/\/fr\/clippers\/postuler$/);
  await page.getByLabel("Pseudo").fill("e2ecuts");
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("E-mail").fill("camille.e2e@demo.peak.local");
  await page.getByLabel("Pays").fill("France");
  await page.getByLabel("Langue(s)").fill("Français");
  await page.getByLabel("Lien 1").fill("https://www.tiktok.com/@e2ecuts");
  await page.getByLabel("Logiciels utilisés").fill("CapCut");
  await page.getByLabel("Ton expérience").selectOption("avance");
  await page.getByLabel("Disponibilité par semaine").selectOption("10_20");
  await page.getByText("J'ai au moins 18 ans.").click();
  await page.getByText("J'accepte la").click();
  await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
  await expect(page.getByText("On regarde ta candidature et on te répond sous 24 h.")).toBeVisible();

  const { data } = await admin.from("clipper_applications").select("status, portfolio_links").eq("email", "camille.e2e@demo.peak.local").limit(1).single();
  expect(data).toMatchObject({ status: "recue", portfolio_links: ["https://www.tiktok.com/@e2ecuts"] });
});

test("la page Créateurs, la FAQ à deux onglets et le bouton « Besoin d'aide ? »", async ({ page }) => {
  await setCommitments(FILLED);
  await page.goto("/fr/createurs");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Vous créez. On vous fait voir.");
  await expect(page.getByText("Une réponse sous 24 h.")).toBeVisible();

  await page.goto("/fr/faq");
  await page.getByRole("tab", { name: "Clippers" }).click();
  await expect(page.getByTestId("faq-list")).toContainText("Comment je suis payé exactement ?");
  await page.getByRole("tab", { name: "Créateurs" }).click();
  await page.getByLabel("Rechercher dans la FAQ").fill("virement");
  await expect(page.getByTestId("faq-list")).toContainText("Comment je paie ?");
  await page.getByText("Comment je paie ?").click();
  await page.getByRole("button", { name: "Oui" }).first().click();
  await expect(page.getByText("Merci pour votre retour.")).toBeVisible();

  await page.getByRole("button", { name: "Besoin d'aide ?" }).click();
  const dialog = page.getByRole("dialog", { name: "Besoin d'aide ?" });
  await dialog.getByLabel("Rechercher dans la FAQ").fill("virement");
  await expect(dialog).toContainText("Comment je paie ?");
  await dialog.getByRole("link", { name: "Contacter l'équipe" }).click();
  await expect(page).toHaveURL(/\/fr\/aide$/);
  await expect(page.getByText("On vous répond sous 24 h.").first()).toBeVisible();

  await page.goto("/en/creators");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("You create. We get you seen.");
});
