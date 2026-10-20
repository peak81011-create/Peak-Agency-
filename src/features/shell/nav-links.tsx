"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav";

function isActive(pathname: string, href: string) {
  return href === "/app" || href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Liens de la barre latérale (bureau), groupés. */
export function SidebarLinks({ items }: { items: NavItem[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item, index) => {
        const showGroup = item.group && item.group !== items[index - 1]?.group;
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <div key={item.key} className="contents">
            {showGroup ? (
              <div className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-sage-500">
                {t(`groups.${item.group!}`)}
              </div>
            ) : null}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium no-underline",
                active
                  ? "bg-sidebar-active font-semibold text-sidebar-active-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span>{t(item.labelKey)}</span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

/** Onglets défilants (mobile). */
export function MobileTabs({ items }: { items: NavItem[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 flex-none items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium no-underline",
              active ? "bg-sidebar-active font-semibold text-sidebar-active-foreground" : "bg-forest-800 text-sage-200",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
