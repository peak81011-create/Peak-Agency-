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
    u.editor = await createUser(db, { email: "editor@test.local", role: "editor" });
    u.client = await createUser(db, { email: "client@test.local" });
    await db.query(
      "insert into public.clipper_applications (full_name, email, experience, hours_per_week) values ('Sam', 'sam@test.local', 'confirme', '10_20')",
    );
  });

  afterAll(async () => {
    await db?.end();
  });

  it("seules les personnes ayant users.manage lisent les candidatures", async () => {
    await asUser(db, u.client, async (q) => {
      expect((await q("select * from public.clipper_applications")).rowCount).toBe(0);
    });
    await asUser(db, u.editor, async (q) => {
      expect((await q("select * from public.clipper_applications")).rowCount).toBe(0);
    });
    await asUser(
      db,
      u.owner,
      async (q) => {
        expect((await q("select * from public.clipper_applications")).rowCount).toBe(1);
        expect((await q("update public.clipper_applications set status = 'en_cours'")).rowCount).toBe(1);
      },
      { aal: "aal2" },
    );
  });

  it("personne ne crée de candidature directement depuis le navigateur", async () => {
    await expect(
      asUser(db, u.client, (q) =>
        q("insert into public.clipper_applications (full_name, email, experience, hours_per_week) values ('x', 'x@x.fr', 'debutant', '10_20')"),
      ),
    ).rejects.toThrow(/permission denied|row-level security/);
  });
});
