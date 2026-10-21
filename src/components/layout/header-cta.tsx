"use client";

import { useLocale } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizedPath } from "@/lib/public-paths";
import { cn } from "@/lib/utils";

/** Bouton principal de l'en-tête, adapté à la page : offres, candidature ou démarrage. */
export function HeaderCta({ labels, className }: { labels: { creators: string; clippers: string; start: string }; className?: string }) {
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const onCreators = pathname.startsWith("/creators") || pathname.startsWith("/createurs");
  const onClippers = pathname.startsWith("/clippers");
  const [href, label] = onClippers
    ? ["/clippers/apply", labels.clippers]
    : onCreators
      ? ["/pricing", labels.creators]
      : ["/pricing", labels.start];
  return (
    <Link href={localizedPath(href, locale)} className={cn(buttonVariants({ variant: "accent" }), className)}>
      {label}
    </Link>
  );
}
