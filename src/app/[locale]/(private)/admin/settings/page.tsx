import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm, type SettingsField } from "@/features/admin/settings/settings-form";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { requirePermission } from "@/lib/auth/session";
import { getSettings, missingInvoiceFields } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.settings");
  return { title: t("title") };
}

const asStrings = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]));

const GROUPS: { key: "commitments" | "company" | "bank" | "billing" | "notifications"; fields: SettingsField[] }[] = [
  {
    key: "commitments",
    fields: [
      { name: "delai_reponse" },
      { name: "delai_activation" },
      { name: "delai_premiers_clips" },
      { name: "conditions_resiliation", multiline: true },
      { name: "minimum_par_clip", inputMode: "numeric" },
      { name: "tarif_1000_vues", inputMode: "numeric" },
      { name: "jours_comptage_vues", inputMode: "numeric" },
      { name: "plafond_par_clip", inputMode: "numeric" },
      { name: "jour_paiement", inputMode: "numeric" },
      { name: "clip_test_remunere" },
      { name: "age_minimum", inputMode: "numeric" },
    ],
  },
  {
    key: "company",
    fields: [
      { name: "legal_name" },
      { name: "trade_name" },
      { name: "legal_form" },
      { name: "siret", inputMode: "numeric" },
      { name: "vat_number" },
      { name: "vat_mention" },
      { name: "address", multiline: true },
      { name: "email", inputMode: "email" },
      { name: "phone" },
      { name: "publication_director" },
      { name: "host", multiline: true },
    ],
  },
  { key: "bank", fields: [{ name: "holder" }, { name: "bank_name" }, { name: "iban" }, { name: "bic" }] },
  {
    key: "billing",
    fields: [
      { name: "payment_reference_prefix" },
      { name: "invoice_prefix" },
      { name: "grace_days", inputMode: "numeric" },
      { name: "reminder_days_before", inputMode: "numeric" },
    ],
  },
  { key: "notifications", fields: [{ name: "admin_email", inputMode: "email" }] },
];

export default async function AdminSettingsPage() {
  await requirePermission("settings.update");
  const t = await getTranslations("admin.settings");
  const [commitments, company, bank, billing, notifications] = await Promise.all([
    getSettings("commitments"),
    getSettings("company"),
    getSettings("bank"),
    getSettings("billing"),
    getSettings("notifications"),
  ]);
  // Montants stockés en centimes, saisis en euros (« 0,50 »).
  const euros = (v: number | null) => (v === null ? "" : (v / 100).toFixed(2).replace(".", ",").replace(",00", ""));
  const values = {
    commitments: {
      ...commitments,
      minimum_par_clip: euros(commitments.minimum_par_clip),
      tarif_1000_vues: euros(commitments.tarif_1000_vues),
      plafond_par_clip: euros(commitments.plafond_par_clip),
    },
    company,
    bank,
    billing,
    notifications,
  };
  const missing = missingInvoiceFields(company);

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        {missing.length ? <Callout tone="warn">{t("missingCompany")}</Callout> : null}
        {GROUPS.map((g) => (
          <Card key={g.key}>
            <CardHeader>
              <CardTitle>{t(`${g.key}.title`)}</CardTitle>
            </CardHeader>
            <p className="-mt-2 mb-4 text-sm text-muted-foreground">{t(`${g.key}.lead`)}</p>
            <SettingsForm settingsKey={g.key} fields={g.fields} defaults={asStrings(values[g.key])} />
          </Card>
        ))}
      </PageBody>
    </>
  );
}
