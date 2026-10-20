import type { Permission, Role } from "@/lib/auth/permission-catalog";
import type { SessionUser } from "@/lib/auth/session";

// Les icônes sont désignées par un nom (les composants ne peuvent pas être
// transmis du serveur vers les composants client) ; voir nav-icons.ts.
export type NavIconName = "home" | "chart" | "user";

// Menus de l'espace privé. Chaque phase ajoute ses entrées ici ; une entrée
// n'apparaît que si l'utilisateur a la permission indiquée.
export type NavItem = {
  key: string;
  href: string;
  labelKey: "dashboard" | "overview" | "account";
  icon: NavIconName;
  permission?: Permission;
  group?: "steering" | "team" | "settings";
};

const CLIENT_NAV: NavItem[] = [
  { key: "dashboard", href: "/app", labelKey: "dashboard", icon: "home" },
  { key: "account", href: "/account", labelKey: "account", icon: "user" },
];

const STAFF_NAV: NavItem[] = [
  { key: "overview", href: "/admin", labelKey: "overview", icon: "chart", group: "steering" },
  { key: "account", href: "/account", labelKey: "account", icon: "user", group: "settings" },
];

export function navFor(user: Pick<SessionUser, "role" | "permissions">): NavItem[] {
  const items = user.role === ("client" satisfies Role) ? CLIENT_NAV : STAFF_NAV;
  return items.filter((item) => !item.permission || user.permissions.has(item.permission));
}
