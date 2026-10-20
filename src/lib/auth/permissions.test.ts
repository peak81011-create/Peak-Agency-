import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, isPermission } from "./permission-catalog";
import { resolvePermission } from "./permissions";

const base = {
  isActive: true,
  mfaVerified: false,
  overrides: [],
} as const;

describe("resolvePermission", () => {
  it("l'owner a tout, mais seulement après la double authentification", () => {
    for (const permission of PERMISSIONS) {
      expect(resolvePermission({ ...base, role: "owner", roleDefaults: [], permission, mfaVerified: true })).toBe(true);
      expect(resolvePermission({ ...base, role: "owner", roleDefaults: [], permission })).toBe(false);
    }
  });

  it("applique les permissions par défaut du rôle", () => {
    const roleDefaults = DEFAULT_ROLE_PERMISSIONS.editor;
    expect(resolvePermission({ ...base, role: "editor", roleDefaults, permission: "clips.create" })).toBe(true);
    expect(resolvePermission({ ...base, role: "editor", roleDefaults, permission: "payments.validate" })).toBe(false);
  });

  it("une exception utilisateur l'emporte sur le rôle (ajout comme retrait)", () => {
    const roleDefaults = DEFAULT_ROLE_PERMISSIONS.assistant;
    expect(
      resolvePermission({
        ...base,
        role: "assistant",
        roleDefaults,
        permission: "payments.validate",
        overrides: [{ permission: "payments.validate", granted: true }],
      }),
    ).toBe(true);
    expect(
      resolvePermission({
        ...base,
        role: "assistant",
        roleDefaults,
        permission: "requests.manage",
        overrides: [{ permission: "requests.manage", granted: false }],
      }),
    ).toBe(false);
  });

  it("un compte désactivé n'a aucune permission", () => {
    expect(
      resolvePermission({ ...base, isActive: false, role: "owner", roleDefaults: [], permission: "clients.read", mfaVerified: true }),
    ).toBe(false);
  });
});

describe("catalogue", () => {
  it("les permissions sont uniques et au format ressource.action", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    for (const p of PERMISSIONS) expect(p).toMatch(/^[a-z_]+\.[a-z_]+$/);
  });

  it("les défauts des rôles n'utilisent que des permissions du catalogue", () => {
    for (const list of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
      for (const p of list) expect(isPermission(p)).toBe(true);
    }
  });
});
