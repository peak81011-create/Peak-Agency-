// Comptes de démonstration (partagés par le seed et les tests Playwright).
export type DemoUser = {
  email: string;
  fullName: string;
  role: "owner" | "assistant" | "prospector" | "clipper" | "client";
  creatorName?: string;
};

export const DEMO_PASSWORD_DEFAULT = "Peak-Demo-2026!";

export const DEMO_USERS = {
  owner: { email: "owner@demo.peak.local", fullName: "Alex Owner", role: "owner" },
  assistant: { email: "assistante@demo.peak.local", fullName: "Camille Assistante", role: "assistant" },
  prospector: { email: "prospecteur@demo.peak.local", fullName: "Yanis Prospecteur", role: "prospector" },
  clipper: { email: "clipper@demo.peak.local", fullName: "Théo Clipper", role: "clipper" },
  clientActive: { email: "client.actif@demo.peak.local", fullName: "Léa Martin", role: "client", creatorName: "Léa Live" },
  clientPending: { email: "client.verif@demo.peak.local", fullName: "Hugo Bernard", role: "client", creatorName: "Hugo Gaming" },
  clientNew: { email: "client.nouveau@demo.peak.local", fullName: "Inès Petit", role: "client", creatorName: "Inès Talks" },
} as const satisfies Record<string, DemoUser>;
