"use client";

import { ArrowRight } from "lucide-react";
import { useLocale } from "next-intl";
import { TransitionLink } from "@/components/transition/page-transition";
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
  return <PillLink href={localizedPath(href, locale)} label={label} className={className} />;
}

/** Bouton « pilule » en dégradé vert avec une flèche dans un rond blanc. */
export function PillLink({
  href,
  label,
  className,
  size = "md",
  transition = false,
  testId,
}: {
  href: string;
  label: string;
  className?: string;
  size?: "md" | "lg";
  /** Passe par la transition « rideau vert » au lieu d'un lien simple. */
  transition?: boolean;
  testId?: string;
}) {
  const Comp = transition ? TransitionLink : Link;
  return (
    <Comp
      href={href}
      data-testid={testId}
      className={cn(
        "peak-cta group inline-flex items-center justify-between gap-3 rounded-full font-semibold text-white no-underline transition hover:brightness-110",
        size === "lg" ? "min-h-14 py-2 pl-7 pr-2 text-lg md:min-h-16 md:text-xl" : "min-h-11 py-1.5 pl-5 pr-1.5 text-[15px]",
        className,
      )}
    >
      {label}
      <span className={cn("grid shrink-0 place-items-center rounded-full bg-white text-forest-900", size === "lg" ? "size-10 md:size-12" : "size-8")}>
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Comp>
  );
}
