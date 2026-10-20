import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { AccountForm } from "@/features/admin/agency/components/account-form";
import { clipFormOptions } from "@/features/admin/agency/form-options";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { requirePermission } from "@/lib/auth/session";
import type { AccountFormInput } from "@/lib/validation/admin-agency";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.accounts");
  return { title: t("title") };
}

export default async function AdminAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requirePermission("accounts.manage");
  const supabase = await createSupabaseServerClient();
  const [t, options] = await Promise.all([getTranslations("admin.accounts"), clipFormOptions()]);
  let defaults: AccountFormInput = {
    clientId: "",
    platform: "tiktok",
    handle: "",
    url: "",
    ownerEmployeeId: "",
    createdOn: new Date().toISOString().slice(0, 10),
    status: "actif",
    followersCount: "0",
    passwordManagerRef: "",
    notes: "",
  };
  if (!isNew) {
    const { data } = await supabase
      .from("social_accounts")
      .select("client_id, platform, handle, url, owner_employee_id, created_on, status, followers_count, private:social_account_private(password_manager_ref, notes)")
      .eq("id", id)
      .maybeSingle();
    if (!data) notFound();
    const priv = (data as unknown as { private: { password_manager_ref: string; notes: string } | null }).private;
    defaults = {
      clientId: data.client_id,
      platform: data.platform,
      handle: data.handle,
      url: data.url ?? "",
      ownerEmployeeId: data.owner_employee_id ?? "",
      createdOn: data.created_on ?? "",
      status: data.status,
      followersCount: String(data.followers_count),
      passwordManagerRef: priv?.password_manager_ref ?? "",
      notes: priv?.notes ?? "",
    };
  }
  return (
    <>
      <PageHeader title={isNew ? t("new") : t("editTitle")} />
      <PageBody>
        <Card>
          <AccountForm accountId={isNew ? null : id} defaults={defaults} clients={options.clients} staff={options.editors} />
        </Card>
      </PageBody>
    </>
  );
}
