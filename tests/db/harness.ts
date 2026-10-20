import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const ROOT = path.resolve(__dirname, "../..");

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/** Crée une base vierge, y applique le shim Supabase puis toutes les migrations. */
export async function createTestDatabase(name: string): Promise<Client> {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL manquant");
  const admin = new Client({ connectionString: TEST_DATABASE_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${name} with (force)`);
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = new URL(TEST_DATABASE_URL);
  url.pathname = `/${name}`;
  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(readFileSync(path.join(ROOT, "tests/db/supabase-shim.sql"), "utf8"));
  const dir = path.join(ROOT, "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.query(readFileSync(path.join(dir, file), "utf8"));
  }
  return db;
}

/** Crée un utilisateur auth (déclenche la création du profil). */
export async function createUser(
  db: Client,
  opts: { email: string; role?: string; fullName?: string },
): Promise<string> {
  const appMeta = opts.role ? { role: opts.role } : {};
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_app_meta_data, raw_user_meta_data) values ($1, $2, $3) returning id",
    [opts.email, appMeta, { full_name: opts.fullName ?? opts.email }],
  );
  return rows[0].id;
}

export async function clientIdOf(db: Client, userId: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>("select id from public.clients where profile_id = $1", [userId]);
  return rows[0].id;
}

/**
 * Exécute fn avec le rôle `authenticated` et le JWT de l'utilisateur, comme
 * le ferait PostgREST. Tout est annulé à la fin (rollback).
 */
export async function asUser<T>(
  db: Client,
  userId: string | null,
  fn: (q: Client["query"]) => Promise<T>,
  opts: { aal?: "aal1" | "aal2" } = {},
): Promise<T> {
  await db.query("begin");
  try {
    if (userId) {
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated", aal: opts.aal ?? "aal1" }),
      ]);
      await db.query("set local role authenticated");
    } else {
      await db.query("select set_config('request.jwt.claims', '{\"role\":\"anon\"}', true)");
      await db.query("set local role anon");
    }
    return await fn(db.query.bind(db) as Client["query"]);
  } finally {
    await db.query("rollback");
  }
}

/** Comme asUser, mais valide la transaction (l'effet est conservé). */
export async function commitAs(
  db: Client,
  userId: string,
  sql: string,
  params: unknown[] = [],
  opts: { aal?: "aal1" | "aal2" } = {},
): Promise<void> {
  await db.query("begin");
  try {
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated", aal: opts.aal ?? "aal1" }),
    ]);
    await db.query("set local role authenticated");
    await db.query(sql, params);
    await db.query("commit");
  } catch (err) {
    await db.query("rollback");
    throw err;
  }
}
