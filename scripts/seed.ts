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
  const existing = await findUserId(user.email);
  if (existing) return existing;
  const { data, error } = await db.auth.admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
    app_metadata: { role: user.role },
    user_metadata: { full_name: user.fullName, creator_name: user.creatorName ?? "", locale: "fr" },
  });
  if (error || !data.user) throw new Error(`Création de ${user.email} : ${error?.message}`);
  return data.user.id;
}

async function ensurePlans(): Promise<string[]> {
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
  const inserted = await check("plans", db.from("plans").insert(rows).select("id, sort_order").order("sort_order"));
  return inserted.map((p) => p.id);
}

async function clientIdOf(profileId: string): Promise<string> {
  const row = await check("clients", db.from("clients").select("id").eq("profile_id", profileId).single());
  return row.id;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
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
  await check(
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
  await check(
    "client à vérifier",
    db
      .from("clients")
      .update({ status: "paiement_a_verifier", plan_id: starter, niche: "Just chatting", language: "fr", profile_completed_at: new Date().toISOString() })
      .eq("id", pending),
  );
  // Client 3 : vient de s'inscrire (statut par défaut « inscrit »)

  const year = new Date().getFullYear();
  await check(
    "paiements",
    db.from("payments").upsert(
      [
        {
          client_id: active,
          plan_id: growth,
          amount_cents: 89000,
          reference: `PEAK-${year}-0001`,
          status: "valide",
          submitted_at: start.toISOString(),
          validated_by: ids.owner,
          validated_at: start.toISOString(),
          period_start: isoDate(start),
          period_end: isoDate(end),
        },
        {
          client_id: pending,
          plan_id: starter,
          amount_cents: 49000,
          reference: `PEAK-${year}-0002`,
          status: "a_verifier",
          submitted_at: new Date().toISOString(),
        },
      ],
      { onConflict: "reference" },
    ),
  );

  // Équipe : le monteur et l'assistante suivent le client actif ; l'assistante suit aussi le client 2.
  await check(
    "attributions",
    db.from("assignments").upsert(
      [
        { user_id: ids.editor, client_id: active, team_role: "monteur" },
        { user_id: ids.assistant, client_id: active, team_role: "assistante" },
        { user_id: ids.assistant, client_id: pending, team_role: "assistante" },
      ],
      { onConflict: "user_id,client_id" },
    ),
  );
  await check(
    "notes internes",
    db.from("client_private_notes").upsert({ client_id: active, body: "Note interne de démonstration (jamais visible par le client)." }),
  );

  console.log("Seed terminé. Comptes de démonstration (mot de passe commun) :");
  for (const user of Object.values(DEMO_USERS)) console.log(`  ${user.role.padEnd(10)} ${user.email}`);
  console.log(`  mot de passe : ${password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
