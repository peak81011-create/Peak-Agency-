import { isUnlocked } from "@/features/client/status";
import type { Permission } from "@/lib/auth/permission-catalog";
import type { SessionUser } from "@/lib/auth/session";

// Les icônes sont désignées par un nom (les composants ne peuvent pas être
// transmis du serveur vers les composants client) ; voir nav-icons.ts.
export type NavIconName = "home" | "chart" | "user" | "card" | "tag" | "file" | "sliders" | "idCard" | "bank";

export type NavLabelKey =
  | "dashboard"
  | "overview"
  | "account"
  | "creatorProfile"
  | "choosePlan"
  | "payment"
  | "billing"
  | "payments"
  | "plans"
  | "content"
  | "settings";

// Menus de l'espace privé. Chaque phase ajoute ses entrées ici ; une entrée
// n'apparaît que si l'utilisateur a la permission indiquée.
export type NavItem = {
  key: string;
  href: string;
  labelKey: NavLabelKey;
  icon: NavIconName;
  permission?: Permission;
  group?: "steering" | "team" | "settings";
};

// Client dont l'espace est verrouillé : profil, offre et paiement uniquement.
const CLIENT_LOCKED_NAV: NavItem[] = [
  { key: "dashboard", href: "/app", labelKey: "dashboard", icon: "home" },
  { key: "profile", href: "/app/profile", labelKey: "creatorProfile", icon: "idCard" },
  { key: "plan", href: "/app/plan", labelKey: "choosePlan", icon: "tag" },
  { key: "payment", href: "/app/payment", labelKey: "payment", icon: "bank" },
  { key: "account", href: "/account", labelKey: "account", icon: "user" },
];

const CLIENT_NAV: NavItem[] = [
  { key: "dashboard", href: "/app", labelKey: "dashboard", icon: "home" },
  { key: "billing", href: "/app/billing", labelKey: "billing", icon: "card" },
  { key: "profile", href: "/app/profile", labelKey: "creatorProfile", icon: "idCard" },
  { key: "account", href: "/account", labelKey: "account", icon: "user" },
];

const STAFF_NAV: NavItem[] = [
  { key: "overview", href: "/admin", labelKey: "overview", icon: "chart", group: "steering" },
  { key: "payments", href: "/admin/payments", labelKey: "payments", icon: "bank", group: "steering", permission: "payments.validate" },
  { key: "plans", href: "/admin/plans", labelKey: "plans", icon: "tag", group: "settings", permission: "plans.manage" },
  { key: "content", href: "/admin/content", labelKey: "content", icon: "file", group: "settings", permission: "content.update" },
  { key: "settings", href: "/admin/settings", labelKey: "settings", icon: "sliders", group: "settings", permission: "settings.update" },
  { key: "account", href: "/account", labelKey: "account", icon: "user", group: "settings" },
];

export function navFor(user: Pick<SessionUser, "role" | "permissions" | "client">): NavItem[] {
  if (user.role === "client") {
    return user.client && isUnlocked(user.client.status) ? CLIENT_NAV : CLIENT_LOCKED_NAV;
  }
  return STAFF_NAV.filter((item) => !item.permission || user.permissions.has(item.permission));
}
