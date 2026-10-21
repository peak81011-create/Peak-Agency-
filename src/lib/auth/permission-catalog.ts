// Catalogue des permissions « ressource.action » et permissions par défaut
// de chaque rôle. Doit rester identique à la migration
// supabase/migrations/20261020000200_reference_data.sql (vérifié par les tests).

export const ROLES = ["owner", "assistant", "prospector", "clipper", "client"] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES = ["owner", "assistant", "prospector", "clipper"] as const satisfies readonly Role[];

export const PERMISSION_GROUPS = {
  clients: [
    "clients.read",
    "clients.read_all",
    "clients.create",
    "clients.update",
    "clients.manage_subscription",
    "clients.internal_notes",
    "clients.view_as",
  ],
  payments: ["payments.read", "payments.validate", "payments.submit_proof"],
  content: ["videos.read", "videos.upload", "clips.read", "clips.create", "clips.validate", "clips.publish"],
  accounts: ["accounts.read", "accounts.manage", "stats.write"],
  requests: ["requests.read", "requests.create", "requests.manage"],
  team: ["tasks.assign", "tasks.read_all", "users.invite", "users.manage", "permissions.manage"],
  prospecting: ["prospects.work", "prospects.assign", "prospects.import", "prospects.read_all", "templates.manage"],
  money: ["payouts.read_own", "payouts.manage"],
  admin: ["plans.manage", "content.update", "settings.update", "reports.view_all", "activity.read", "api_keys.manage"],
} as const;

export type PermissionGroup = keyof typeof PERMISSION_GROUPS;
export type Permission = (typeof PERMISSION_GROUPS)[PermissionGroup][number];

export const PERMISSIONS: readonly Permission[] = Object.values(PERMISSION_GROUPS).flat();

// L'owner a toujours tout : il n'apparaît pas ici.
export const DEFAULT_ROLE_PERMISSIONS: Record<Exclude<Role, "owner">, readonly Permission[]> = {
  assistant: [
    "clients.read",
    "clients.internal_notes",
    "videos.read",
    "clips.read",
    "accounts.read",
    "stats.write",
    "requests.read",
    "requests.manage",
    "payouts.read_own",
  ],
  prospector: ["prospects.work", "payouts.read_own"],
  clipper: [
    "clients.read",
    "clients.internal_notes",
    "videos.read",
    "clips.read",
    "clips.create",
    "clips.publish",
    "accounts.read",
    "stats.write",
    "payouts.read_own",
  ],
  client: ["payments.submit_proof", "videos.upload", "requests.create", "clips.validate"],
};

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
