import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "@/lib/auth/permission-catalog";
import { TEST_DATABASE_URL, asUser, clientIdOf, createTestDatabase, createUser } from "./harness";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("RLS et permissions (Postgres)", () => {
  let db: Client;
  const u: Record<string, string> = {};
  const c: Record<string, string> = {};

  beforeAll(async () => {
    db = await createTestDatabase("peak_test_rls");
    u.owner = await createUser(db, { email: "owner@test.local", role: "owner" });
    u.assistant = await createUser(db, { email: "assistant@test.local", role: "assistant" });
    u.editor = await createUser(db, { email: "editor@test.local", role: "editor" });
    u.prospector = await createUser(db, { email: "prospector@test.local", role: "prospector" });
    u.clientA = await createUser(db, { email: "a@test.local" });
    u.clientB = await createUser(db, { email: "b@test.local" });
    c.A = await clientIdOf(db, u.clientA);
    c.B = await clientIdOf(db, u.clientB);

    await db.query("insert into public.assignments (user_id, client_id) values ($1, $2), ($3, $2)", [
      u.editor,
      c.A,
      u.assistant,
    ]);
    const plan = await db.query<{ id: string }>(
      "insert into public.plans (name_fr, name_en, price_cents) values ('Démo', 'Demo', 10000) returning id",
    );
    await db.query(
      "insert into public.plans (name_fr, name_en, price_cents, is_visible) values ('Cachée', 'Hidden', 1, false)",
    );
    await db.query(
      `insert into public.payments (client_id, plan_id, amount_cents, reference, status)
       values ($1, $3, 10000, 'PEAK-A', 'a_verifier'), ($2, $3, 10000, 'PEAK-B', 'a_verifier')`,
      [c.A, c.B, plan.rows[0].id],
    );
    await db.query("insert into public.client_private_notes (client_id, body) values ($1, 'secret')", [c.A]);
  });

  afterAll(async () => {
    await db?.end();
  });

  it("le catalogue SQL est identique au catalogue TypeScript", async () => {
    const perms = await db.query<{ key: string }>("select key from public.permissions order by sort_order");
    expect(perms.rows.map((r) => r.key)).toEqual([...PERMISSIONS]);
    const rp = await db.query<{ role: string; permission: string }>(
      "select role::text, permission from public.role_permissions",
    );
    for (const [role, list] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const fromDb = rp.rows.filter((r) => r.role === role).map((r) => r.permission);
      expect(fromDb.sort()).toEqual([...list].sort());
    }
  });

  it("l'inscription crée le profil et la fiche client ; le rôle vient de app_metadata", async () => {
    const roles = await db.query<{ role: string }>("select role::text from public.profiles where id = any($1)", [
      [u.owner, u.clientA],
    ]);
    expect(roles.rows.map((r) => r.role).sort()).toEqual(["client", "owner"]);
    const staffClients = await db.query("select 1 from public.clients where profile_id = $1", [u.editor]);
    expect(staffClients.rowCount).toBe(0);
  });

  it("un client ne voit que sa propre fiche, ses paiements et son profil", async () => {
    await asUser(db, u.clientA, async (q) => {
      const clients = await q<{ id: string }>("select id from public.clients");
      expect(clients.rows.map((r) => r.id)).toEqual([c.A]);
      const payments = await q<{ reference: string }>("select reference from public.payments");
      expect(payments.rows.map((r) => r.reference)).toEqual(["PEAK-A"]);
      const profiles = await q<{ id: string }>("select id from public.profiles");
      // lui-même + l'équipe qui lui est attribuée (monteur, assistante)
      expect(profiles.rows.map((r) => r.id).sort()).toEqual([u.clientA, u.editor, u.assistant].sort());
      // accès direct par id à la fiche d'un autre client : rien
      const other = await q("select * from public.clients where id = $1", [c.B]);
      expect(other.rowCount).toBe(0);
    });
  });

  it("un client ne lit jamais les notes internes", async () => {
    await asUser(db, u.clientA, async (q) => {
      const notes = await q("select * from public.client_private_notes");
      expect(notes.rowCount).toBe(0);
    });
    await asUser(db, u.editor, async (q) => {
      const notes = await q("select body from public.client_private_notes");
      expect(notes.rows).toEqual([{ body: "secret" }]);
    });
  });

  it("un monteur ne voit que les clients qui lui sont attribués", async () => {
    await asUser(db, u.editor, async (q) => {
      const clients = await q<{ id: string }>("select id from public.clients");
      expect(clients.rows.map((r) => r.id)).toEqual([c.A]);
      const payments = await q("select * from public.payments");
      expect(payments.rowCount).toBe(0); // pas de payments.read par défaut
    });
  });

  it("le prospecteur ne voit aucun client", async () => {
    await asUser(db, u.prospector, async (q) => {
      expect((await q("select * from public.clients")).rowCount).toBe(0);
    });
  });

  it("l'owner voit tout, une fois la double authentification validée", async () => {
    await asUser(
      db,
      u.owner,
      async (q) => {
        expect((await q("select * from public.clients")).rowCount).toBe(2);
        expect((await q("select * from public.payments")).rowCount).toBe(2);
      },
      { aal: "aal2" },
    );
    await asUser(db, u.owner, async (q) => {
      expect((await q("select * from public.clients")).rowCount).toBe(0);
    });
  });

  it("une exception utilisateur retire ou ajoute une permission immédiatement", async () => {
    const has = (userId: string, perm: string) =>
      asUser(db, userId, async (q) => (await q<{ ok: boolean }>("select public.has_permission($1) ok", [perm])).rows[0].ok);

    expect(await has(u.assistant, "requests.manage")).toBe(true);
    await db.query(
      "insert into public.user_permission_overrides (user_id, permission, granted) values ($1, 'requests.manage', false)",
      [u.assistant],
    );
    expect(await has(u.assistant, "requests.manage")).toBe(false);

    expect(await has(u.assistant, "payments.validate")).toBe(false);
    await db.query(
      "insert into public.user_permission_overrides (user_id, permission, granted) values ($1, 'payments.validate', true)",
      [u.assistant],
    );
    await asUser(db, u.assistant, async (q) => {
      expect((await q("select * from public.payments")).rowCount).toBe(2);
    });
    await db.query("delete from public.user_permission_overrides where user_id = $1", [u.assistant]);
  });

  it("un compte désactivé perd toutes ses permissions", async () => {
    await db.query("update public.profiles set is_active = false where id = $1", [u.editor]);
    await asUser(db, u.editor, async (q) => {
      expect((await q("select * from public.clients")).rowCount).toBe(0);
    });
    await db.query("update public.profiles set is_active = true where id = $1", [u.editor]);
  });

  it("un client peut modifier son profil créateur mais pas son statut ni son offre", async () => {
    await asUser(db, u.clientA, async (q) => {
      const ok = await q("update public.clients set creator_name = 'Alice' where id = $1", [c.A]);
      expect(ok.rowCount).toBe(1);
    });
    await expect(
      asUser(db, u.clientA, (q) => q("update public.clients set status = 'actif' where id = $1", [c.A])),
    ).rejects.toThrow(/manage_subscription/);
    await asUser(db, u.clientA, async (q) => {
      const res = await q("update public.clients set creator_name = 'x' where id = $1", [c.B]);
      expect(res.rowCount).toBe(0);
    });
  });

  it("personne ne peut changer son propre rôle ; un non-owner ne peut pas nommer d'owner", async () => {
    await expect(
      asUser(db, u.clientA, (q) => q("update public.profiles set role = 'owner' where id = $1", [u.clientA])),
    ).rejects.toThrow();
    await db.query(
      "insert into public.user_permission_overrides (user_id, permission, granted) values ($1, 'users.manage', true)",
      [u.assistant],
    );
    await expect(
      asUser(db, u.assistant, (q) => q("update public.profiles set role = 'owner' where id = $1", [u.editor])),
    ).rejects.toThrow(/propriétaire/);
    await db.query("delete from public.user_permission_overrides where user_id = $1", [u.assistant]);
  });

  it("un client ne peut pas écrire de paiement ni s'accorder une permission", async () => {
    await expect(
      asUser(db, u.clientA, (q) =>
        q("insert into public.payments (client_id, amount_cents, reference, status) values ($1, 0, 'X', 'valide')", [
          c.A,
        ]),
      ),
    ).rejects.toThrow();
    await expect(
      asUser(db, u.clientA, (q) =>
        q(
          "insert into public.user_permission_overrides (user_id, permission, granted) values ($1, 'clients.read_all', true)",
          [u.clientA],
        ),
      ),
    ).rejects.toThrow();
  });

  it("un visiteur anonyme ne voit que les offres visibles et rien d'autre", async () => {
    await asUser(db, null, async (q) => {
      const plans = await q<{ name_fr: string }>("select name_fr from public.plans");
      expect(plans.rows.map((r) => r.name_fr)).toEqual(["Démo"]);
    });
    await expect(asUser(db, null, (q) => q("select * from public.clients"))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, null, (q) => q("select * from public.settings"))).rejects.toThrow(/permission denied/);
  });

  it("les paramètres (IBAN…) ne sont pas lisibles par un client", async () => {
    await asUser(db, u.clientA, async (q) => {
      expect((await q("select * from public.settings")).rowCount).toBe(0);
    });
  });

  it("le rate limit bloque au-delà du maximum", async () => {
    const hit = async () =>
      (await db.query<{ ok: boolean }>("select public.rate_limit_hit('login:test', 3, 60) ok")).rows[0].ok;
    expect([await hit(), await hit(), await hit(), await hit()]).toEqual([true, true, true, false]);
  });
});
