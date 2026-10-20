import type { LucideIcon } from "lucide-react";
import { Home, LineChart, UserRound } from "lucide-react";
import type { Permission, Role } from "@/lib/auth/permission-catalog";
import type { SessionUser } from "@/lib/auth/session";

// Menus de l'espace privé. Chaque phase ajoute ses entrées ici ; une entrée
// n'apparaît que si l'utilisateur a la permission indiquée.
export type NavItem = {
  key: string;
  href: string;
  labelKey: "dashboard" | "overview" | "account";
  icon: LucideIcon;
  permission?: Permission;
  group?: "steering" | "team" | "settings";
};

const CLIENT_NAV: NavItem[] = [
  { key: "dashboard", href: "/app", labelKey: "dashboard", icon: Home },
  { key: "account", href: "/account", labelKey: "account", icon: UserRound },
];

const STAFF_NAV: NavItem[] = [
  { key: "overview", href: "/admin", labelKey: "overview", icon: LineChart, group: "steering" },
  { key: "account", href: "/account", labelKey: "account", icon: UserRound, group: "settings" },
];

export function navFor(user: Pick<SessionUser, "role" | "permissions">): NavItem[] {
  const items = user.role === ("client" satisfies Role) ? CLIENT_NAV : STAFF_NAV;
  return items.filter((item) => !item.permission || user.permissions.has(item.permission));
}
