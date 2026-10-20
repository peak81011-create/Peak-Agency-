import { ShieldCheck, ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { updateLocaleAction } from "@/features/account/actions";
import { PageBody, PageHeader } from "@/features/shell/app-shell";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const mfaOn = (factors?.totp ?? []).some((f) => f.status === "verified");

  return (
    <>
      <PageHeader title={t("account.title")} />
      <PageBody>
        <Card>
          <CardHeader>
            <CardTitle>{t("account.profile")}</CardTitle>
          </CardHeader>
          <dl className="grid grid-cols-1 gap-x-5 gap-y-1 text-sm md:grid-cols-[minmax(120px,auto)_1fr] md:gap-y-2.5">
            <dt className="text-subtle-foreground">{t("auth.fullName")}</dt>
            <dd className="mb-2.5 font-medium md:mb-0">{user.fullName || "—"}</dd>
            <dt className="text-subtle-foreground">{t("auth.email")}</dt>
            <dd className="mb-2.5 font-medium md:mb-0">{user.email}</dd>
          </dl>
          <form action={updateLocaleAction} className="mt-5 flex flex-wrap items-end gap-3">
            <div className="flex min-w-48 flex-col gap-1.5">
              <Label htmlFor="locale">{t("account.language")}</Label>
              <Select id="locale" name="locale" defaultValue={user.locale}>
                {routing.locales.map((l) => (
                  <option key={l} value={l}>
                    {t(`common.languageLong.${l}`)}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              {t("common.save")}
            </Button>
          </form>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("account.security")}</CardTitle>
          </CardHeader>
          <p className="flex items-center gap-2 text-sm">
            {mfaOn ? (
              <ShieldCheck className="size-5 text-t-green-fg" aria-hidden />
            ) : (
              <ShieldOff className="size-5 text-subtle-foreground" aria-hidden />
            )}
            {mfaOn ? t("account.mfaEnabled") : t("account.mfaDisabled")}
          </p>
          {!mfaOn ? (
            <Link href="/mfa" className={buttonVariants({ variant: "secondary", className: "mt-4" })}>
              {t("account.mfaEnable")}
            </Link>
          ) : null}
        </Card>
      </PageBody>
    </>
  );
}
