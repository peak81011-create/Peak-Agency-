import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_DATABASE_URL, asUser, commitAs, createTestDatabase, createUser } from "./harness";

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("Service client (Postgres)", () => {
  let db: Client;
  const u: Record<string, string> = {};
  let ticket = "";

  const insertTicket = "insert into public.support_tickets (author_id, audience, category, subject) values ($1, 'createur', 'paiement', 'Mon virement') returning id";

  beforeAll(async () => {
    db = await createTestDatabase("peak_test_support");
    u.a = await createUser(db, { email: "a@test.local" });
    u.b = await createUser(db, { email: "b@test.local" });
    u.assistant = await createUser(db, { email: "assistant@test.local", role: "assistant" });
    u.clipper = await createUser(db, { email: "clipper@test.local", role: "clipper" });
    await commitAs(db, u.a, insertTicket, [u.a]);
    ticket = (await db.query<{ id: string }>("select id from public.support_tickets limit 1")).rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
  });

  it("chacun ne voit que ses tickets ; l'équipe support voit tout", async () => {
    await asUser(db, u.b, async (q) => {
      expect((await q("select * from public.support_tickets")).rowCount).toBe(0);
    });
    await asUser(db, u.clipper, async (q) => {
      expect((await q("select * from public.support_tickets")).rowCount).toBe(0);
    });
    await asUser(db, u.assistant, async (q) => {
      expect((await q("select * from public.support_tickets")).rowCount).toBe(1);
    });
  });

  it("un ticket créé ne peut pas être pré-attribué ni marqué résolu", async () => {
    await expect(
      asUser(db, u.a, (q) =>
        q("insert into public.support_tickets (author_id, audience, category, subject, status) values ($1, 'createur', 'autre', 'Test', 'resolu')", [u.a]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("note interne invisible pour l'auteur ; la réponse de l'équipe met le ticket en attente de l'utilisateur", async () => {
    await commitAs(db, u.assistant, "insert into public.ticket_messages (ticket_id, author_id, body, is_internal) values ($1, $2, 'interne', true)", [ticket, u.assistant]);
    await commitAs(db, u.assistant, "insert into public.ticket_messages (ticket_id, author_id, body) values ($1, $2, 'Bonjour !')", [ticket, u.assistant]);
    const t = await db.query<{ status: string; first_response_at: string | null }>("select status, first_response_at from public.support_tickets where id = $1", [ticket]);
    expect(t.rows[0].status).toBe("attente_utilisateur");
    expect(t.rows[0].first_response_at).not.toBeNull();
    await asUser(db, u.a, async (q) => {
      const bodies = (await q<{ body: string }>("select body from public.ticket_messages")).rows.map((r) => r.body);
      expect(bodies).toEqual(["Bonjour !"]);
    });
    await expect(
      asUser(db, u.a, (q) => q("insert into public.ticket_messages (ticket_id, author_id, body, is_internal) values ($1, $2, 'x', true)", [ticket, u.a])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(db, u.b, (q) => q("insert into public.ticket_messages (ticket_id, author_id, body) values ($1, $2, 'x')", [ticket, u.b])),
    ).rejects.toThrow(/row-level security/);
  });

  it("résolu, noté, puis rouvert dans les 7 jours (pas au-delà)", async () => {
    await commitAs(db, u.a, "select public.ticket_resolve($1)", [ticket]);
    await commitAs(db, u.a, "select public.ticket_rate($1, 5::smallint, 'Merci')", [ticket]);
    expect((await db.query("select satisfaction from public.support_tickets where id = $1", [ticket])).rows[0].satisfaction).toBe(5);
    await expect(asUser(db, u.b, (q) => q("select public.ticket_rate($1, 1::smallint, null)", [ticket]))).rejects.toThrow(/forbidden/);

    await commitAs(db, u.a, "select public.ticket_reopen($1)", [ticket]);
    expect((await db.query("select status from public.support_tickets where id = $1", [ticket])).rows[0].status).toBe("ouvert");

    await db.query("update public.support_tickets set status = 'resolu', resolved_at = now() - interval '8 days' where id = $1", [ticket]);
    await expect(asUser(db, u.a, (q) => q("select public.ticket_reopen($1)", [ticket]))).rejects.toThrow(/réouverture impossible/);
  });
});
