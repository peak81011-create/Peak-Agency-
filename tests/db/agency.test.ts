import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_DATABASE_URL, asUser, clientIdOf, commitAs, createTestDatabase, createUser } from "./harness";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("Vidéos, clips, comptes, demandes (Postgres)", () => {
  let db: Client;
  const u: Record<string, string> = {};
  const c: Record<string, string> = {};
  const clip: Record<string, string> = {};
  let accountA = "";

  const one = async (sql: string, params: unknown[] = []) => (await db.query<{ id: string }>(sql, params)).rows[0].id;

  beforeAll(async () => {
    db = await createTestDatabase("peak_test_agency");
    u.owner = await createUser(db, { email: "owner@test.local", role: "owner" });
    u.editor = await createUser(db, { email: "editor@test.local", role: "editor" });
    u.editor2 = await createUser(db, { email: "editor2@test.local", role: "editor" });
    u.a = await createUser(db, { email: "a@test.local" });
    u.b = await createUser(db, { email: "b@test.local" });
    c.a = await clientIdOf(db, u.a);
    c.b = await clientIdOf(db, u.b);
    await db.query("update public.clients set status = 'actif', period_end = current_date + 20 where id in ($1, $2)", [c.a, c.b]);
    await db.query("insert into public.assignments (user_id, client_id) values ($1, $2), ($3, $2)", [u.editor, c.a, u.editor2]);

    accountA = await one(
      "insert into public.social_accounts (client_id, platform, handle) values ($1, 'tiktok', '@a') returning id",
      [c.a],
    );
    await db.query("insert into public.social_account_private (account_id, password_manager_ref) values ($1, 'Bitwarden › A')", [accountA]);
    await db.query("insert into public.social_accounts (client_id, platform, handle) values ($1, 'tiktok', '@b')", [c.b]);
    await db.query(
      "insert into public.source_videos (client_id, kind, url, title) values ($1, 'lien', 'https://x.test/a', 'A'), ($2, 'lien', 'https://x.test/b', 'B')",
      [c.a, c.b],
    );
    clip.toReview = await one(
      "insert into public.clips (client_id, title, status, editor_id, social_account_id) values ($1, 'À valider', 'a_valider', $2, $3) returning id",
      [c.a, u.editor, accountA],
    );
    clip.rejected = await one("insert into public.clips (client_id, title, status) values ($1, 'Rejeté', 'rejete') returning id", [c.a]);
    clip.otherEditor = await one(
      "insert into public.clips (client_id, title, status, editor_id) values ($1, 'Autre monteur', 'en_montage', $2) returning id",
      [c.a, u.editor2],
    );
    clip.b = await one("insert into public.clips (client_id, title, status) values ($1, 'Clip B', 'publie') returning id", [c.b]);
    await db.query("insert into public.clip_stats_snapshots (clip_id, views) values ($1, 100), ($2, 999)", [clip.toReview, clip.b]);
    await db.query(
      "insert into public.comments (client_id, entity_type, entity_id, body, is_internal) values ($1, 'clip', $2, 'interne', true), ($1, 'clip', $2, 'public', false)",
      [c.a, clip.toReview],
    );
    await db.query("insert into public.requests (client_id, type, title) values ($1, 'autre', 'Demande B')", [c.b]);
  });

  afterAll(async () => {
    await db?.end();
  });

  it("un client ne voit aucune donnée d'un autre client, même en interrogeant la base directement", async () => {
    await asUser(db, u.a, async (q) => {
      for (const table of ["source_videos", "clips", "social_accounts", "requests", "comments"]) {
        const rows = await q<{ client_id: string }>(`select client_id from public.${table}`);
        expect(rows.rows.every((r) => r.client_id === c.a), table).toBe(true);
      }
      expect((await q("select * from public.clips where id = $1", [clip.b])).rowCount).toBe(0);
      const stats = await q<{ views: string }>("select views from public.clip_stats_snapshots");
      expect(stats.rows.map((r) => Number(r.views))).toEqual([100]);
    });
  });

  it("un client ne voit ni les clips rejetés, ni les commentaires internes, ni les références de mots de passe", async () => {
    await asUser(db, u.a, async (q) => {
      const titles = (await q<{ title: string }>("select title from public.clips order by title")).rows.map((r) => r.title);
      expect(titles).not.toContain("Rejeté");
      const comments = (await q<{ body: string }>("select body from public.comments")).rows.map((r) => r.body);
      expect(comments).toEqual(["public"]);
      expect((await q("select * from public.social_account_private")).rowCount).toBe(0);
    });
  });

  it("un monteur ne voit que les clients qui lui sont attribués", async () => {
    await asUser(db, u.editor, async (q) => {
      const clips = (await q<{ client_id: string }>("select client_id from public.clips")).rows;
      expect(clips.length).toBeGreaterThan(0);
      expect(clips.every((r) => r.client_id === c.a)).toBe(true);
      const videos = (await q<{ client_id: string }>("select client_id from public.source_videos")).rows;
      expect(videos.map((v) => v.client_id)).toEqual([c.a]);
      expect((await q("select * from public.requests")).rowCount).toBe(0);
    });
  });

  it("un monteur ne modifie que ses propres clips", async () => {
    await asUser(db, u.editor, async (q) => {
      expect((await q("update public.clips set hook = 'x' where id = $1", [clip.toReview])).rowCount).toBe(1);
      expect((await q("update public.clips set hook = 'x' where id = $1", [clip.otherEditor])).rowCount).toBe(0);
    });
    await asUser(
      db,
      u.owner,
      async (q) => {
        expect((await q("update public.clips set hook = 'x' where id = $1", [clip.otherEditor])).rowCount).toBe(1);
      },
      { aal: "aal2" },
    );
  });

  it("le client envoie une vidéo et fait une demande seulement si son espace est actif", async () => {
    const insertVideo = "insert into public.source_videos (client_id, uploaded_by, kind, url) values ($1, $2, 'lien', 'https://x.test/v')";
    await asUser(db, u.a, (q) => q(insertVideo, [c.a, u.a]));
    await expect(asUser(db, u.a, (q) => q(insertVideo, [c.b, u.a]))).rejects.toThrow(/row-level security/);

    await db.query("update public.clients set status = 'lecture_seule' where id = $1", [c.a]);
    await expect(asUser(db, u.a, (q) => q(insertVideo, [c.a, u.a]))).rejects.toThrow(/row-level security/);
    await expect(
      asUser(db, u.a, (q) =>
        q("insert into public.requests (client_id, created_by, type, title) values ($1, $2, 'autre', 'x')", [c.a, u.a]),
      ),
    ).rejects.toThrow(/row-level security/);
    // En lecture seule, il voit toujours ses données
    await asUser(db, u.a, async (q) => {
      expect((await q("select * from public.clips")).rowCount).toBeGreaterThan(0);
    });
    await db.query("update public.clients set status = 'actif' where id = $1", [c.a]);
  });

  it("une demande créée par le client ne peut pas être pré-attribuée ni changer de statut", async () => {
    await expect(
      asUser(db, u.a, (q) =>
        q("insert into public.requests (client_id, created_by, type, title, status) values ($1, $2, 'autre', 'x', 'terminee')", [c.a, u.a]),
      ),
    ).rejects.toThrow(/row-level security/);
    await commitAs(db, u.a, "insert into public.requests (client_id, created_by, type, title) values ($1, $2, 'clip', 'Mon idée')", [c.a, u.a]);
    const id = await one("select id from public.requests where title = 'Mon idée'");
    await asUser(db, u.a, async (q) => {
      expect((await q("update public.requests set status = 'en_cours' where id = $1", [id])).rowCount).toBe(0);
    });
    await commitAs(db, u.a, "select public.client_close_request($1)", [id]);
    expect((await db.query("select status::text s from public.requests where id = $1", [id])).rows[0].s).toBe("terminee");
  });

  it("validation d'un clip par le client : modification avec commentaire, puis validation", async () => {
    await expect(asUser(db, u.a, (q) => q("select public.client_review_clip($1, false, '')", [clip.toReview]))).rejects.toThrow(
      /précisez/,
    );
    await expect(asUser(db, u.b, (q) => q("select public.client_review_clip($1, true, null)", [clip.toReview]))).rejects.toThrow(
      /forbidden/,
    );
    await commitAs(db, u.a, "select public.client_review_clip($1, false, 'Couper la fin à 0:41')", [clip.toReview]);
    const after = await db.query<{ status: string; client_feedback: string }>(
      "select status::text, client_feedback from public.clips where id = $1",
      [clip.toReview],
    );
    expect(after.rows[0]).toEqual({ status: "en_montage", client_feedback: "Couper la fin à 0:41" });

    await db.query("update public.clips set status = 'a_valider' where id = $1", [clip.toReview]);
    await commitAs(db, u.a, "select public.client_review_clip($1, true, null)", [clip.toReview]);
    expect((await db.query("select status::text s from public.clips where id = $1", [clip.toReview])).rows[0].s).toBe("valide");
  });

  it("le client ne peut pas écrire de commentaire interne", async () => {
    await expect(
      asUser(db, u.a, (q) =>
        q(
          "insert into public.comments (client_id, entity_type, entity_id, author_id, body, is_internal) values ($1, 'clip', $2, $3, 'x', true)",
          [c.a, clip.toReview, u.a],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("gestion de l'abonnement par l'agence : prolonger réactive un client en lecture seule", async () => {
    await db.query("update public.clients set status = 'lecture_seule', period_end = current_date - 30 where id = $1", [c.b]);
    await expect(
      asUser(db, u.editor, (q) => q("select public.admin_update_subscription($1, 'extend', null, null, current_date + 30)", [c.b])),
    ).rejects.toThrow(/forbidden/);
    await commitAs(db, u.owner, "select public.admin_update_subscription($1, 'extend', null, null, current_date + 30)", [c.b], {
      aal: "aal2",
    });
    expect((await db.query("select status::text s from public.clients where id = $1", [c.b])).rows[0].s).toBe("actif");
    await commitAs(db, u.owner, "select public.admin_update_subscription($1, 'suspend')", [c.b], { aal: "aal2" });
    expect((await db.query("select status::text s from public.clients where id = $1", [c.b])).rows[0].s).toBe("suspendu");
    // Un client suspendu ne voit plus son espace
    await asUser(db, u.b, async (q) => {
      expect((await q("select * from public.clips")).rowCount).toBe(0);
    });
  });

  it("l'équipe d'un client = personnes attribuées + owners", async () => {
    const team = (await db.query<{ id: string }>("select public.client_team($1) id", [c.a])).rows.map((r) => r.id).sort();
    expect(team).toEqual([u.owner, u.editor, u.editor2].sort());
  });
});
