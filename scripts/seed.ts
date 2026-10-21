/**
 * Données de démonstration : 1 owner, 1 assistante, 1 prospecteur, 1 monteur,
 * 3 clients dans des états différents, 3 offres « démo ».
 *
 *   npm run seed            (base locale uniquement)
 *   npm run seed -- --force (autorise une base distante, ex. projet de test)
 *
 * Le script est idempotent : il peut être relancé sans créer de doublons.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { DEMO_PASSWORD_DEFAULT, DEMO_USERS, type DemoUser } from "./demo-accounts";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.DEMO_PASSWORD ?? DEMO_PASSWORD_DEFAULT;
const force = process.argv.includes("--force");

if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY sont requis (.env.local).");
  process.exit(1);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) && !force) {
  console.error(`Refus : ${url} n'est pas une base locale. Relancez avec --force si c'est voulu.`);
  process.exit(1);
}

const db: SupabaseClient = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });



async function check<T>(label: string, p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error || data === null) throw new Error(`${label} : ${error?.message ?? "aucune donnée"}`);
  return data as NonNullable<T>;
}

/** Écriture sans retour de données : seule l'erreur compte. */
async function run(label: string, p: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await p;
  if (error) throw new Error(`${label} : ${error.message}`);
}

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
}

async function ensureUser(user: DemoUser): Promise<string> {
  let id = await findUserId(user.email);
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      app_metadata: { role: user.role },
      user_metadata: { full_name: user.fullName, creator_name: user.creatorName ?? "", locale: "fr" },
    });
    if (error || !data.user) throw new Error(`Création de ${user.email} : ${error?.message}`);
    id = data.user.id;
  }
  // Selon la version de Supabase Auth, app_metadata peut être écrit après
  // l'insertion du compte : on aligne donc explicitement le profil sur le rôle.
  await run(`rôle de ${user.email}`, db.from("profiles").update({ role: user.role, full_name: user.fullName }).eq("id", id));
  if (user.role !== "client") {
    await run(`fiche client de ${user.email}`, db.from("clients").delete().eq("profile_id", id));
  } else {
    await run(
      `fiche client de ${user.email}`,
      db.from("clients").upsert({ profile_id: id, creator_name: user.creatorName ?? "" }, { onConflict: "profile_id" }),
    );
  }
  return id;
}

async function ensurePlans(): Promise<string[]> {
  // Les offres réelles (créées par la migration ou par l'admin) sont utilisées en priorité.
  const real = await check("plans", db.from("plans").select("id").eq("is_demo", false).eq("is_visible", true).order("sort_order"));
  if (real.length >= 2) return real.map((p) => p.id);
  const existing = await check("plans", db.from("plans").select("id").eq("is_demo", true).order("sort_order"));
  if (existing.length) return existing.map((p) => p.id);
  const rows = [
    {
      name_fr: "Démo — Essentiel",
      name_en: "Demo — Starter",
      description_fr: "Offre de démonstration : à remplacer par vos vraies offres.",
      description_en: "Demo plan: replace it with your real plans.",
      price_cents: 49000,
      clips_per_period: 30,
      accounts_included: 1,
      platforms: ["tiktok"],
      delivery_days: 3,
      features_fr: ["30 clips par mois", "1 compte TikTok dédié"],
      features_en: ["30 clips per month", "1 dedicated TikTok account"],
      sort_order: 10,
    },
    {
      name_fr: "Démo — Croissance",
      name_en: "Demo — Growth",
      description_fr: "Offre de démonstration : à remplacer par vos vraies offres.",
      description_en: "Demo plan: replace it with your real plans.",
      price_cents: 89000,
      clips_per_period: 60,
      accounts_included: 3,
      platforms: ["tiktok", "instagram", "youtube"],
      delivery_days: 2,
      features_fr: ["60 clips par mois", "3 comptes dédiés"],
      features_en: ["60 clips per month", "3 dedicated accounts"],
      sort_order: 20,
      is_featured: true,
    },
    {
      name_fr: "Démo — Intensif",
      name_en: "Demo — Intensive",
      description_fr: "Offre de démonstration : à remplacer par vos vraies offres.",
      description_en: "Demo plan: replace it with your real plans.",
      price_cents: 149000,
      clips_per_period: 120,
      accounts_included: 6,
      platforms: ["tiktok", "instagram", "youtube"],
      delivery_days: 1,
      features_fr: ["120 clips par mois", "6 comptes dédiés"],
      features_en: ["120 clips per month", "6 dedicated accounts"],
      sort_order: 30,
    },
  ].map((r) => ({ ...r, is_demo: true, currency: "EUR", billing_period: "mensuel" }));
  const inserted = await check("plans", db.from("plans").insert(rows, { defaultToNull: false }).select("id, sort_order").order("sort_order"));
  return inserted.map((p) => p.id);
}

async function clientIdOf(profileId: string): Promise<string> {
  const row = await check("clients", db.from("clients").select("id").eq("profile_id", profileId).single());
  return row.id;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Données de démonstration de la phase 3 pour le client actif (une seule fois). */
async function seedAgencyData(clientId: string, ids: Record<keyof typeof DEMO_USERS, string>) {
  const existing = await check("clips existants", db.from("clips").select("id").eq("client_id", clientId).limit(1));
  if (existing.length) return;

  await run(
    "note interne",
    db.from("comments").insert({
      client_id: clientId,
      entity_type: "client",
      entity_id: clientId,
      author_id: ids.owner,
      body: "Note interne de démonstration (jamais visible par le client).",
      is_internal: true,
    }),
  );

  const accounts = await check(
    "comptes",
    db
      .from("social_accounts")
      .insert([
        { client_id: clientId, platform: "tiktok", handle: "@lea.clips.demo", url: "https://www.tiktok.com/@lea.clips.demo", owner_employee_id: ids.clipper, created_on: isoDate(new Date()), followers_count: 4820 },
        { client_id: clientId, platform: "youtube", handle: "Léa Clips (démo)", url: "https://www.youtube.com/@leaclipsdemo", owner_employee_id: ids.clipper, created_on: isoDate(new Date()), followers_count: 690 },
      ], { defaultToNull: false })
      .select("id, platform"),
  );
  await run(
    "comptes (interne)",
    db.from("social_account_private").insert(accounts.map((a) => ({ account_id: a.id, password_manager_ref: "Bitwarden › Peak › Démo" }))),
  );

  const video = await check(
    "vidéo",
    db
      .from("source_videos")
      .insert({
        client_id: clientId,
        uploaded_by: ids.clientActive,
        title: "Live du jeudi (démo)",
        kind: "lien",
        url: "https://www.twitch.tv/videos/000000000",
        notes: "Moment fort vers 1:05:00.",
        priority: "haute",
        status: "en_traitement",
      })
      .select("id")
      .single(),
  );

  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString();
  const tiktok = accounts.find((a) => a.platform === "tiktok")!.id;
  const clips = await check(
    "clips",
    db
      .from("clips")
      .insert([
        { client_id: clientId, source_video_id: video.id, social_account_id: tiktok, clipper_id: ids.clipper, title: "Le fou rire du live", hook: "Impossible de garder mon sérieux", status: "publie", published_at: day(-2), published_url: "https://www.tiktok.com/@lea.clips.demo", created_by: ids.owner },
        { client_id: clientId, source_video_id: video.id, social_account_id: tiktok, clipper_id: ids.clipper, title: "La réaction du chat", hook: "Il n'a rien compris", status: "a_valider", scheduled_at: day(2), due_at: day(1), created_by: ids.owner },
        { client_id: clientId, source_video_id: video.id, social_account_id: tiktok, clipper_id: ids.clipper, title: "Trois conseils pour débuter", status: "en_montage", due_at: day(3), created_by: ids.owner },
      ], { defaultToNull: false })
      .select("id, status"),
  );
  const published = clips.find((c) => c.status === "publie")!.id;
  await run(
    "statistiques",
    db.from("clip_stats_snapshots").insert([
      { clip_id: published, captured_at: day(-1), views: 12400, likes: 830, comments: 41, shares: 22, created_by: ids.owner },
      { clip_id: published, captured_at: day(0), views: 18950, likes: 1210, comments: 63, shares: 37, created_by: ids.owner },
    ]),
  );
  await run(
    "demande",
    db.from("requests").insert({
      client_id: clientId,
      created_by: ids.clientActive,
      type: "style",
      title: "Sous-titres en anglais sur les Shorts",
      description: "Une partie de mon audience YouTube est anglophone.",
    }),
  );
}

async function main() {
  const ids: Record<keyof typeof DEMO_USERS, string> = {} as never;
  for (const [key, user] of Object.entries(DEMO_USERS) as [keyof typeof DEMO_USERS, DemoUser][]) {
    ids[key] = await ensureUser(user);
  }
  const [starter, growth] = await ensurePlans();

  const active = await clientIdOf(ids.clientActive);
  const pending = await clientIdOf(ids.clientPending);

  const start = new Date();
  start.setDate(start.getDate() - 10);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  // Client 1 : actif (paiement validé), validation client activée
  await run(
    "client actif",
    db
      .from("clients")
      .update({
        status: "actif",
        plan_id: growth,
        period_start: isoDate(start),
        period_end: isoDate(end),
        requires_client_validation: true,
        niche: "Gaming",
        language: "fr",
        channels: { twitch: "https://www.twitch.tv/exemple", youtube: "https://www.youtube.com/@exemple" },
        profile_completed_at: new Date().toISOString(),
      })
      .eq("id", active),
  );
  // Client 2 : preuve de virement déposée, à vérifier
  await run(
    "client à vérifier",
    db
      .from("clients")
      .update({ status: "paiement_a_verifier", plan_id: starter, niche: "Just chatting", language: "fr", profile_completed_at: new Date().toISOString() })
      .eq("id", pending),
  );
  // Client 3 : vient de s'inscrire (statut par défaut « inscrit »)

  // Paiements de démonstration : références tirées du compteur officiel, pour
  // ne jamais entrer en collision avec celles des vrais clients.
  const demoPayments = [
    {
      client_id: active,
      plan_id: growth,
      amount_cents: 27900,
      status: "valide",
      submitted_at: start.toISOString(),
      validated_by: ids.owner,
      validated_at: start.toISOString(),
      period_start: isoDate(start),
      period_end: isoDate(end),
    },
    { client_id: pending, plan_id: starter, amount_cents: 14900, status: "a_verifier", submitted_at: new Date().toISOString() },
  ];
  for (const payment of demoPayments) {
    const existing = await check(
      "paiements existants",
      db.from("payments").select("id").eq("client_id", payment.client_id),
    );
    if (existing.length) continue;
    const reference = await check("référence", db.rpc("new_payment_reference"));
    await run("paiement de démo", db.from("payments").insert({ ...payment, reference }, { defaultToNull: false }));
  }

  // Équipe : le monteur et l'assistante suivent le client actif ; l'assistante suit aussi le client 2.
  await run(
    "attributions",
    db.from("assignments").upsert(
      [
        { user_id: ids.clipper, client_id: active, team_role: "clipper" },
        { user_id: ids.assistant, client_id: active, team_role: "assistante" },
        { user_id: ids.assistant, client_id: pending, team_role: "assistante" },
      ],
      { onConflict: "user_id,client_id" },
    ),
  );
  await seedAgencyData(active, ids);

  // Coordonnées bancaires de démonstration (IBAN d'exemple officiel, invalide pour un vrai virement).
  // Écrites seulement si aucune coordonnée réelle n'a été saisie.
  const { data: bank } = await db.from("settings").select("value").eq("key", "bank").single();
  if (!bank?.value?.iban) {
    await run(
      "banque de démo",
      db.from("settings").update({
        value: { holder: "DÉMO — à remplacer", iban: "FR7630006000011234567890189", bic: "AGRIFRPPXXX", bank_name: "Banque de démonstration" },
      }).eq("key", "bank"),
    );
  }

  console.log("Seed terminé. Comptes de démonstration (mot de passe commun) :");
  for (const user of Object.values(DEMO_USERS)) console.log(`  ${user.role.padEnd(10)} ${user.email}`);
  console.log(`  mot de passe : ${password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
