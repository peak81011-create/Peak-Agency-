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

const asStrings = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v ?? "")]));

const GROUPS: { key: "company" | "bank" | "billing" | "notifications"; fields: SettingsField[] }[] = [
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
  const [company, bank, billing, notifications] = await Promise.all([
    getSettings("company"),
    getSettings("bank"),
    getSettings("billing"),
    getSettings("notifications"),
  ]);
  const values = { company, bank, billing, notifications };
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
