import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { DEMO_PASSWORD, DEMO_USERS, adminClient, login, loginAsOwner } from "./helpers";

// Un second client actif, créé pour ces tests, qui ne doit jamais voir les
// données de Léa (client actif de démonstration) ni être vu par le monteur.
const OTHER = { email: "client.isole@test.peak.local", creatorName: "Client isolé (test)" };

const admin = adminClient();

async function clientIdOf(email: string) {
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const id = users.users.find((u) => u.email === email)?.id;
  const { data } = await admin.from("clients").select("id").eq("profile_id", id!).single();
  return data!.id as string;
}

/** Client Supabase connecté comme un utilisateur, avec la clé publique (comme un navigateur). */
async function asUser(email: string) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await db.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw error;
  return db;
}

let leaClient = "";
let otherClient = "";
let leaClip = "";
let leaVideo = "";
let otherClip = "";

test.beforeAll(async () => {
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  let userId = users.users.find((u) => u.email === OTHER.email)?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: OTHER.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      app_metadata: { role: "client" },
      user_metadata: { full_name: "Client Isolé", creator_name: OTHER.creatorName, locale: "fr" },
    });
    if (error) throw error;
    userId = data.user.id;
  }
  await admin.from("clients").upsert({ profile_id: userId, creator_name: OTHER.creatorName }, { onConflict: "profile_id" });
  otherClient = await clientIdOf(OTHER.email);
  const periodEnd = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
  await admin.from("clients").update({ status: "actif", profile_completed_at: new Date().toISOString(), period_end: periodEnd }).eq("id", otherClient);

  leaClient = await clientIdOf(DEMO_USERS.clientActive.email);
  const { data: clip } = await admin.from("clips").select("id").eq("client_id", leaClient).eq("title", "La réaction du chat").single();
  leaClip = clip!.id;
  // Remet le clip « à valider » (le test de validation le fait passer en montage).
  await admin.from("clips").update({ status: "a_valider", client_feedback: null }).eq("id", leaClip);
  const { data: video } = await admin.from("source_videos").select("id").eq("client_id", leaClient).limit(1).single();
  leaVideo = video!.id;

  const { data: existing } = await admin.from("clips").select("id").eq("client_id", otherClient).limit(1).maybeSingle();
  otherClip =
    existing?.id ??
    (await admin.from("clips").insert({ client_id: otherClient, title: "Clip du client isolé", status: "en_montage" }).select("id").single()).data!.id;
});

test.describe("Isolement des données", () => {
  test("un client ne voit aucune donnée d'un autre client, ni par l'interface, ni par l'API, ni en interrogeant Supabase", async ({ page }) => {
    // Base de données, directement avec la clé publique
    const db = await asUser(OTHER.email);
    for (const table of ["clips", "source_videos", "social_accounts", "requests", "comments", "clients", "payments", "invoices"]) {
      const { data, error } = await db.from(table).select("client_id");
      expect(error, table).toBeNull();
      expect(
        (data ?? []).every((r: { client_id: string }) => r.client_id === otherClient),
        `${table} : uniquement ses propres lignes`,
      ).toBe(true);
    }
    const { data: lea } = await db.from("clips").select("id").eq("id", leaClip);
    expect(lea).toEqual([]);
    const { data: privateRefs } = await db.from("social_account_private").select("*");
    expect(privateRefs ?? []).toEqual([]);
    // Écriture chez un autre client : refusée
    const { error: insertError } = await db.from("requests").insert({ client_id: leaClient, type: "autre", title: "intrusion" });
    expect(insertError).not.toBeNull();

    // Interface et routes API
    await login(page, OTHER.email);
    await expect(page).toHaveURL(/\/fr\/app$/);
    const res = await page.goto(`/fr/app/clips/${leaClip}`);
    expect(res?.status()).toBe(404);
    const download = await page.request.get(`/api/videos/${leaVideo}/download`, { maxRedirects: 0 });
    expect(download.status()).toBe(404);
    await page.goto("/fr/app/clips");
    await expect(page.getByText("Le fou rire du live")).toHaveCount(0);
  });

  test("le monteur ne voit que les clients qui lui sont attribués", async ({ page }) => {
    const db = await asUser(DEMO_USERS.editor.email);
    const { data: clients } = await db.from("clients").select("id");
    expect((clients ?? []).map((c) => c.id)).toEqual([leaClient]);
    const { data: clips } = await db.from("clips").select("client_id");
    expect((clips ?? []).length).toBeGreaterThan(0);
    expect((clips ?? []).every((c) => c.client_id === leaClient)).toBe(true);
    const { data: hidden } = await db.from("clips").select("id").eq("id", otherClip);
    expect(hidden).toEqual([]);

    await login(page, DEMO_USERS.editor.email);
    await expect(page).toHaveURL(/\/fr\/admin$/);
    await page.goto("/fr/admin/clips?view=list");
    await expect(page.getByText("La réaction du chat").first()).toBeVisible();
    await expect(page.getByText("Clip du client isolé")).toHaveCount(0);
    const res = await page.goto(`/fr/admin/clients/${otherClient}`);
    expect(res?.status()).toBe(404);
  });
});

test.describe("Cœur de l'agence", () => {
  test("le client envoie une vidéo par lien et par fichier", async ({ page }) => {
    await login(page, DEMO_USERS.clientActive.email);
    await page.goto("/fr/app/videos");
    await page.getByRole("tab", { name: "Lien" }).click();
    await page.getByLabel("Titre").fill("Podcast e2e (lien)");
    await page.getByLabel("Lien vers la vidéo").fill("https://drive.google.com/file/d/e2e-demo/view");
    await page.getByRole("button", { name: "Envoyer la vidéo" }).click();
    await expect(page.getByText("Podcast e2e (lien)").first()).toBeVisible();

    // Envoi direct vers le stockage (MinIO en local / CI, R2 en production)
    await page.getByRole("tab", { name: "Fichier" }).click();
    await page.getByLabel("Titre").fill("Podcast e2e (fichier)");
    await page.getByTestId("video-upload-input").setInputFiles({
      name: "podcast-e2e.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.alloc(256 * 1024, 1),
    });
    await expect(page.getByText("Podcast e2e (fichier)").first()).toBeVisible({ timeout: 30_000 });
    const { data: uploaded } = await admin
      .from("source_videos")
      .select("status, size_bytes")
      .eq("client_id", leaClient)
      .eq("title", "Podcast e2e (fichier)")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(uploaded).toMatchObject({ status: "recue", size_bytes: 256 * 1024 });
  });

  test("le client demande une modification sur un clip à valider, puis le valide", async ({ page }) => {
    await login(page, DEMO_USERS.clientActive.email);
    await page.goto(`/fr/app/clips/${leaClip}`);
    await page.getByRole("button", { name: "Demander une modification" }).click();
    await page.getByLabel("Que faut-il modifier ?").fill("Couper la fin à 0:41");
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(page.getByRole("button", { name: "Valider le clip" })).toHaveCount(0);
    await expect
      .poll(async () => (await admin.from("clips").select("status, client_feedback").eq("id", leaClip).single()).data)
      .toEqual({ status: "en_montage", client_feedback: "Couper la fin à 0:41" });

    await admin.from("clips").update({ status: "a_valider" }).eq("id", leaClip);
    await page.reload();
    await page.getByRole("button", { name: "Valider le clip" }).click();
    await expect.poll(async () => (await admin.from("clips").select("status").eq("id", leaClip).single()).data?.status).toBe("valide");
  });

  test("le client fait une demande, l'agence la prend en charge et répond", async ({ page, browser }) => {
    const title = `Idée e2e ${Date.now()}`;
    await login(page, DEMO_USERS.clientActive.email);
    await page.goto("/fr/app/requests");
    await page.getByLabel("Titre").fill(title);
    await page.getByLabel("Description").fill("Un clip sur la question du chat, format court.");
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(page).toHaveURL(/\/fr\/app\/requests\/[0-9a-f-]{36}$/);
    const requestUrl = page.url();

    const ownerPage = await (await browser.newContext({ locale: "fr-FR" })).newPage();
    await loginAsOwner(ownerPage);
    await ownerPage.goto("/fr/admin/requests");
    await ownerPage.getByTestId("admin-request-list").getByText(title).click();
    await ownerPage.getByLabel("Statut").selectOption("en_cours");
    await ownerPage.getByRole("button", { name: "Enregistrer" }).click();
    await expect(ownerPage.getByText("Modifications enregistrées.")).toBeVisible();
    // Note interne : jamais visible par le client
    await ownerPage.getByLabel("Votre message").fill("Note interne e2e");
    await ownerPage.getByLabel("Note interne (invisible pour le client)").check();
    await ownerPage.getByRole("button", { name: "Envoyer", exact: true }).click();
    await expect(ownerPage.getByText("Note interne e2e")).toBeVisible();
    await ownerPage.getByLabel("Votre message").fill("Bonne idée, on s'en occupe !");
    await ownerPage.getByRole("button", { name: "Envoyer", exact: true }).click();
    await expect(ownerPage.getByText("Bonne idée, on s'en occupe !")).toBeVisible();

    await page.goto(requestUrl);
    await expect(page.getByText("Bonne idée, on s'en occupe !")).toBeVisible();
    await expect(page.getByText("Note interne e2e")).toHaveCount(0);
    await expect(page.getByText("En cours").first()).toBeVisible();
  });
});
