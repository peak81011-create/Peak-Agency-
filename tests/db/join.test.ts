import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_DATABASE_URL, asUser, createTestDatabase, createUser } from "./harness";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("Candidatures clippers (Postgres)", () => {
  let db: Client;
  const u: Record<string, string> = {};

  beforeAll(async () => {
    db = await createTestDatabase("peak_test_join");
    u.owner = await createUser(db, { email: "owner@test.local", role: "owner" });
    u.clipper = await createUser(db, { email: "clipper@test.local", role: "clipper" });
    u.client = await createUser(db, { email: "client@test.local" });
    await db.query(
      `insert into public.clipper_applications (nickname, first_name, email, age_confirmed, country, languages, portfolio_links, software, experience, hours_per_week)
       values ('samcuts', 'Sam', 'sam@test.local', true, 'France', 'FR', array['https://x.test/a'], 'CapCut', 'avance', '10_20')`,
    );
  });

  afterAll(async () => {
    await db?.end();
  });

  it("seules les personnes ayant users.manage lisent les candidatures", async () => {
    await asUser(db, u.client, async (q) => {
      expect((await q("select * from public.clipper_applications")).rowCount).toBe(0);
    });
    await asUser(db, u.clipper, async (q) => {
      expect((await q("select * from public.clipper_applications")).rowCount).toBe(0);
    });
    await asUser(
      db,
      u.owner,
      async (q) => {
        expect((await q("select * from public.clipper_applications")).rowCount).toBe(1);
        expect((await q("update public.clipper_applications set status = 'test_envoye'")).rowCount).toBe(1);
      },
      { aal: "aal2" },
    );
  });

  it("FAQ et niveaux lisibles par tous ; votes et engagements réservés", async () => {
    await asUser(db, u.client, async (q) => {
      expect((await q("select * from public.faq_items")).rowCount).toBeGreaterThan(20);
      expect((await q("select * from public.clipper_levels")).rowCount).toBe(3);
      expect((await q("select * from public.faq_feedback")).rowCount).toBe(0);
      const commitments = await q<{ c: { age_minimum: number; delai_reponse: string } }>("select public.public_commitments() c");
      expect(commitments.rows[0].c).toMatchObject({ age_minimum: 18, delai_reponse: "" });
    });
    await expect(
      asUser(db, u.client, (q) =>
        q("insert into public.faq_items (audience, question_fr, answer_fr, question_en, answer_en) values ('tous','q','a','q','a')"),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("un visiteur non connecté lit la FAQ visible", async () => {
    await db.query("begin");
    try {
      await db.query("set local role anon");
      const rows = await db.query("select id from public.faq_items");
      expect(rows.rowCount).toBeGreaterThan(20);
    } finally {
      await db.query("rollback");
    }
  });

  it("le rôle clipper remplace editor", async () => {
    const roles = await db.query<{ r: string }>("select unnest(enum_range(null::public.app_role))::text r");
    expect(roles.rows.map((x) => x.r)).toContain("clipper");
    expect(roles.rows.map((x) => x.r)).not.toContain("editor");
  });

  it("personne ne crée de candidature directement depuis le navigateur", async () => {
    await expect(
      asUser(db, u.client, (q) =>
        q(
          `insert into public.clipper_applications (nickname, first_name, email, age_confirmed, country, languages, portfolio_links, software, experience, hours_per_week)
           values ('x', 'x', 'x@x.fr', true, 'FR', 'FR', array['https://x.test'], 'x', 'debutant', '10_20')`,
        ),
      ),
    ).rejects.toThrow(/permission denied|row-level security/);
  });
});
