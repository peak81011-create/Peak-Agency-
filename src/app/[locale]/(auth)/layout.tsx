import { getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Link } from "@/i18n/navigation";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="min-h-dvh bg-accent text-forest-900">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-6 md:px-8">
        <Link href="/" aria-label={t("homeAria")} className="text-forest-900 no-underline">
          <Logo wordmark={t("wordmark")} />
        </Link>
        <Suspense>
          <LocaleSwitcher />
        </Suspense>
      </header>
      <main id="main" className="flex justify-center px-4 pb-20 pt-4">
        {children}
      </main>
    </div>
  );
}
