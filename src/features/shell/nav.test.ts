import { describe, expect, it } from "vitest";
import type { Permission } from "@/lib/auth/permission-catalog";
import { navFor } from "./nav";

const client = (status: "inscrit" | "actif") => ({
  role: "client" as const,
  permissions: new Set<Permission>(),
  client: { id: "c", status, creatorName: "", planId: null, profileCompleted: true },
});

describe("menus", () => {
  it("un client verrouillé n'a que profil, offre, paiement et compte", () => {
    expect(navFor(client("inscrit")).map((i) => i.key)).toEqual(["dashboard", "profile", "plan", "payment", "account"]);
    expect(navFor(client("actif")).map((i) => i.key)).toContain("billing");
  });

  it("l'équipe ne voit que les entrées autorisées", () => {
    const keys = navFor({ role: "assistant", permissions: new Set<Permission>(["payments.validate"]), client: null }).map((i) => i.key);
    expect(keys).toEqual(["overview", "payments", "account"]);
    const clipper = navFor({
      role: "clipper",
      permissions: new Set<Permission>(["clients.read", "clips.read", "videos.read", "accounts.read"]),
      client: null,
    }).map((i) => i.key);
    expect(clipper).toEqual(["overview", "clients", "clips", "videos", "accounts", "account"]);
  });
});
