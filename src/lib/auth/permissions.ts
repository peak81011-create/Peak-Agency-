import type { Permission, Role } from "./permission-catalog";

export type PermissionOverride = { permission: Permission; granted: boolean };

/**
 * Règle unique (identique à public.has_permission en SQL) :
 * - owner : tout, à condition d'avoir validé la double authentification ;
 * - sinon une exception utilisateur l'emporte ;
 * - sinon la permission par défaut du rôle.
 */
export function resolvePermission(input: {
  role: Role;
  isActive: boolean;
  mfaVerified: boolean;
  roleDefaults: readonly Permission[];
  overrides: readonly PermissionOverride[];
  permission: Permission;
}): boolean {
  if (!input.isActive) return false;
  if (input.role === "owner") return input.mfaVerified;
  const override = input.overrides.find((o) => o.permission === input.permission);
  if (override) return override.granted;
  return input.roleDefaults.includes(input.permission);
}
