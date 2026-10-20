import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_DATABASE_URL, asUser, clientIdOf, commitAs, createTestDatabase, createUser } from "./harness";

const suite = TEST_DATABASE_URL ? describe : describe.skip;
const year = new Date().getFullYear();

suite("Paiements, factures et cycle d'abonnement (Postgres)", () => {
  let db: Client;
  const u: Record<string, string> = {};
  const c: Record<string, string> = {};
  let plan: string;
  let hiddenPlan: string;

  const asOwner = <T>(fn: Parameters<typeof asUser<T>>[2]) => asUser(db, u.owner, fn, { aal: "aal2" });
  const paymentOf = async (clientId: string) =>
    (
      await db.query<{ id: string; status: string; reference: string; amount_cents: number; kind: string }>(
        "select id, status::text, reference, amount_cents, kind from public.payments where client_id = $1 order by created_at desc limit 1",
        [clientId],
      )
    ).rows[0];
  const clientRow = async (clientId: string) =>
    (
      await db.query<{ status: string; period_start: string | null; period_end: string | null }>(
        "select status::text, period_start::text, period_end::text from public.clients where id = $1",
        [clientId],
      )
    ).rows[0];
  const putProof = (path: string) =>
    db.query("insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)", [path]);

  beforeAll(async () => {
    db = await createTestDatabase("peak_test_payments");
    u.owner = await createUser(db, { email: "owner@test.local", role: "owner" });
    u.assistant = await createUser(db, { email: "assistant@test.local", role: "assistant" });
    u.a = await createUser(db, { email: "a@test.local" });
    u.b = await createUser(db, { email: "b@test.local" });
    c.a = await clientIdOf(db, u.a);
    c.b = await clientIdOf(db, u.b);
    plan = (
      await db.query<{ id: string }>(
        "insert into public.plans (name_fr, name_en, price_cents) values ('Croissance', 'Growth', 89000) returning id",
      )
    ).rows[0].id;
    hiddenPlan = (
      await db.query<{ id: string }>(
        "insert into public.plans (name_fr, name_en, price_cents, is_visible) values ('Cachée', 'Hidden', 1, false) returning id",
      )
    ).rows[0].id;
    await db.query(
      `update public.settings set value = value || '{"legal_name": "Peak SAS", "vat_mention": "TVA non applicable, art. 293 B du CGI"}' where key = 'company'`,
    );
  });

  afterAll(async () => {
    await db?.end();
  });

  it("le choix d'une offre ouvre un paiement avec une référence unique", async () => {
    await commitAs(db, u.a, "select public.client_choose_plan($1)", [plan]);
    const p = await paymentOf(c.a);
    expect(p).toMatchObject({ status: "en_attente", reference: `PEAK-${year}-0001`, amount_cents: 89000, kind: "initial" });
    expect((await clientRow(c.a)).status).toBe("attente_paiement");

    // Changer d'avis garde la même référence (pas de doublon de paiement)
    await commitAs(db, u.a, "select public.client_choose_plan($1)", [plan]);
    expect((await paymentOf(c.a)).reference).toBe(`PEAK-${year}-0001`);

    await commitAs(db, u.b, "select public.client_choose_plan($1)", [plan]);
    expect((await paymentOf(c.b)).reference).toBe(`PEAK-${year}-0002`);
  });

  it("une offre masquée ne peut pas être choisie", async () => {
    await expect(asUser(db, u.a, (q) => q("select public.client_choose_plan($1)", [hiddenPlan]))).rejects.toThrow(
      /indisponible/,
    );
  });

  it("la preuve doit exister dans le stockage et appartenir au client", async () => {
    const p = await paymentOf(c.a);
    const path = `${c.a}/${p.id}/virement.png`;
    await expect(
      asUser(db, u.a, (q) => q("select public.submit_payment_proof($1, $2, 'image/png')", [p.id, path])),
    ).rejects.toThrow(/introuvable/);

    await putProof(path);
    // Un autre client ne peut pas déposer sur ce paiement
    await expect(
      asUser(db, u.b, (q) => q("select public.submit_payment_proof($1, $2, 'image/png')", [p.id, path])),
    ).rejects.toThrow(/forbidden/);

    await commitAs(db, u.a, "select public.submit_payment_proof($1, $2, 'image/png')", [p.id, path]);
    expect((await paymentOf(c.a)).status).toBe("a_verifier");
    expect((await clientRow(c.a)).status).toBe("paiement_a_verifier");
  });

  it("seules les personnes autorisées valident un paiement", async () => {
    const p = await paymentOf(c.a);
    await expect(asUser(db, u.a, (q) => q("select public.validate_payment($1)", [p.id]))).rejects.toThrow(/forbidden/);
    await expect(asUser(db, u.assistant, (q) => q("select public.validate_payment($1)", [p.id]))).rejects.toThrow(
      /forbidden/,
    );
    // L'owner sans double authentification n'a aucun droit
    await expect(asUser(db, u.owner, (q) => q("select public.validate_payment($1)", [p.id]))).rejects.toThrow(/forbidden/);
  });

  it("la validation débloque le client, fixe la période et émet une facture numérotée", async () => {
    const p = await paymentOf(c.a);
    await commitAs(db, u.owner, "select public.validate_payment($1)", [p.id], { aal: "aal2" });

    expect((await paymentOf(c.a)).status).toBe("valide");
    const client = await clientRow(c.a);
    expect(client.status).toBe("actif");
    const start = new Date(client.period_start!);
    const end = new Date(client.period_end!);
    const expectedEnd = new Date(start);
    expectedEnd.setMonth(expectedEnd.getMonth() + 1);
    expectedEnd.setDate(expectedEnd.getDate() - 1);
    expect(end.toISOString().slice(0, 10)).toBe(expectedEnd.toISOString().slice(0, 10));

    const inv = await db.query<{ number: string; total_cents: number; vat_mention: string; seller: string }>(
      "select number, total_cents, vat_mention, seller_snapshot->>'legal_name' seller from public.invoices where client_id = $1",
      [c.a],
    );
    expect(inv.rows).toEqual([
      { number: `F-${year}-0001`, total_cents: 89000, vat_mention: "TVA non applicable, art. 293 B du CGI", seller: "Peak SAS" },
    ]);
  });

  it("un paiement déjà validé ne peut pas l'être une seconde fois (pas de double facture)", async () => {
    const p = await paymentOf(c.a);
    await expect(asOwner((q) => q("select public.validate_payment($1)", [p.id]))).rejects.toThrow(/déjà validé/);
  });

  it("la numérotation des factures ne laisse aucun trou, même après une transaction annulée", async () => {
    await db.query("begin");
    await db.query("select public.next_document_number('invoice', $1)", [year]);
    await db.query("rollback");
    const next = await db.query<{ n: number }>("select public.next_document_number('invoice', $1) n", [year]);
    expect(next.rows[0].n).toBe(2);
    await db.query("update public.document_counters set last_value = last_value - 1 where kind = 'invoice'");
  });

  it("chaque client ne voit que ses propres factures", async () => {
    await asUser(db, u.a, async (q) => {
      expect((await q("select * from public.invoices")).rowCount).toBe(1);
    });
    await asUser(db, u.b, async (q) => {
      expect((await q("select * from public.invoices")).rowCount).toBe(0);
    });
  });

  it("une facture ne peut être ni modifiée ni supprimée", async () => {
    await expect(db.query("update public.invoices set number = 'X' where client_id = $1", [c.a])).rejects.toThrow(
      /ne peut pas être modifiée/,
    );
    await expect(db.query("delete from public.invoices where client_id = $1", [c.a])).rejects.toThrow(
      /ne peut pas être supprimée/,
    );
  });

  it("un refus exige un motif, renvoie le client au dépôt, et il peut redéposer", async () => {
    const p = await paymentOf(c.b);
    const path = `${c.b}/${p.id}/preuve.pdf`;
    await putProof(path);
    await commitAs(db, u.b, "select public.submit_payment_proof($1, $2, 'application/pdf')", [p.id, path]);

    await expect(asOwner((q) => q("select public.refuse_payment($1, '  ')", [p.id]))).rejects.toThrow(/motif/);
    await commitAs(db, u.owner, "select public.refuse_payment($1, 'Montant incorrect')", [p.id], { aal: "aal2" });

    const refused = await db.query<{ status: string; refusal_reason: string }>(
      "select status::text, refusal_reason from public.payments where id = $1",
      [p.id],
    );
    expect(refused.rows[0]).toEqual({ status: "refuse", refusal_reason: "Montant incorrect" });
    expect((await clientRow(c.b)).status).toBe("attente_paiement");

    // Le client voit le motif et redépose
    await asUser(db, u.b, async (q) => {
      const seen = await q<{ refusal_reason: string }>("select refusal_reason from public.payments where id = $1", [p.id]);
      expect(seen.rows[0].refusal_reason).toBe("Montant incorrect");
    });
    const path2 = `${c.b}/${p.id}/preuve-2.pdf`;
    await putProof(path2);
    await commitAs(db, u.b, "select public.submit_payment_proof($1, $2, 'application/pdf')", [p.id, path2]);
    expect((await paymentOf(c.b)).status).toBe("a_verifier");
  });

  it("un client ne peut ni écrire un paiement ni modifier sa période directement", async () => {
    await expect(
      asUser(db, u.a, (q) => q("update public.clients set period_end = '2099-01-01' where id = $1", [c.a])),
    ).rejects.toThrow(/manage_subscription/);
    await asUser(db, u.a, async (q) => {
      const res = await q("update public.payments set status = 'valide' where client_id = $1", [c.a]);
      expect(res.rowCount).toBe(0);
    });
  });

  it("cycle d'abonnement : rappel avec nouvelle référence, délai de grâce, puis lecture seule", async () => {
    const run = async (today: string) =>
      (
        await db.query<{ client_id: string; event: string }>(
          "select client_id, event from public.run_subscription_lifecycle($1::date)",
          [today],
        )
      ).rows.filter((r) => r.client_id === c.a);
    const { period_end } = await clientRow(c.a);
    const day = (offset: number) => {
      const d = new Date(period_end!);
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };

    expect(await run(day(-10))).toEqual([]);
    expect(await run(day(-7))).toEqual([{ client_id: c.a, event: "renewal_reminder" }]);
    const renewal = await paymentOf(c.a);
    expect(renewal).toMatchObject({ status: "en_attente", kind: "renewal" });
    expect(renewal.reference).not.toBe(`PEAK-${year}-0001`);
    expect(await run(day(-6))).toEqual([]); // pas de second rappel

    expect(await run(day(1))).toEqual([{ client_id: c.a, event: "grace_started" }]);
    expect((await clientRow(c.a)).status).toBe("grace");
    expect(await run(day(7))).toEqual([]); // encore dans les 7 jours de grâce
    expect(await run(day(8))).toEqual([{ client_id: c.a, event: "read_only" }]);
    expect((await clientRow(c.a)).status).toBe("lecture_seule");
  });

  it("les destinataires des notifications de paiement suivent les permissions", async () => {
    const recipients = async () =>
      (await db.query<{ id: string }>("select public.users_with_permission('payments.validate') id")).rows.map((r) => r.id);
    expect(await recipients()).toEqual([u.owner]);
    await db.query(
      "insert into public.user_permission_overrides (user_id, permission, granted) values ($1, 'payments.validate', true)",
      [u.assistant],
    );
    expect((await recipients()).sort()).toEqual([u.owner, u.assistant].sort());

    // Avec cette permission, l'assistante voit qui a payé (identité du client)
    await asUser(db, u.assistant, async (q) => {
      expect((await q("select id from public.clients")).rowCount).toBe(2);
      expect((await q("select id from public.payments")).rowCount).toBeGreaterThan(0);
    });
  });

  it("le formulaire de contact n'est pas écrivable directement depuis l'API", async () => {
    await expect(
      asUser(db, null, (q) => q("insert into public.contact_messages (name, email, message) values ('x', 'x@x.fr', 'x')")),
    ).rejects.toThrow();
    await expect(
      asUser(db, u.a, (q) => q("insert into public.contact_messages (name, email, message) values ('x', 'x@x.fr', 'x')")),
    ).rejects.toThrow();
  });
});
