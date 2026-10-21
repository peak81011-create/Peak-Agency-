import "server-only";
import { type PlanRow, getVisiblePlans } from "@/features/client/queries";

// Les 4 offres affichées sur le site public. Elles viennent de la base
// (Admin → Offres & tarifs) dès qu'au moins une offre réelle y existe ;
// sinon (base pas encore à jour), ce catalogue intégré prend le relais pour
// que la vitrine ne soit jamais vide. Mêmes valeurs que la migration
// 20261027000100_price_per_clip.sql : 0,99 € le clip.

const CATALOG_PREFIX = "catalog-";

/** Offre du catalogue intégré (pas encore en base : pas d'identifiant réel). */
export function isCatalogPlan(id: string): boolean {
  return id.startsWith(CATALOG_PREFIX);
}

type Offer = {
  slug: string;
  name: [string, string];
  tagline: [string, string];
  description: [string, string];
  clips: number;
  accounts: number;
  platforms: string[];
  deliveryDays: number;
  clipLength: [string, string];
  features: [string[], string[]];
  details: [string, string];
  featured?: boolean;
};

function details(fr: { who: string; items: string[]; clips: number }, en: { who: string; items: string[] }): [string, string] {
  const priceFr = `${fr.clips} clips × 0,99 € = ${String((fr.clips * 99) / 100).replace(".", ",")} € par mois.`;
  const priceEn = `${fr.clips} clips × €0.99 = €${(fr.clips * 99) / 100} a month.`;
  return [
    `## Pour qui ?\n\n${fr.who}\n\n## Ce que vous recevez\n\n${fr.items.map((i) => `- ${i}`).join("\n")}\n\n## Le prix\n\n${priceFr}`,
    `## Who is it for?\n\n${en.who}\n\n## What you get\n\n${en.items.map((i) => `- ${i}`).join("\n")}\n\n## The price\n\n${priceEn}`,
  ];
}

const OFFERS: Offer[] = [
  {
    slug: "lancement",
    name: ["Lancement", "Launch"],
    tagline: ["Pour tester le clipping.", "To try clipping."],
    description: ["Environ 3 clips par jour sur TikTok.", "About 3 clips a day on TikTok."],
    clips: 100,
    accounts: 1,
    platforms: ["tiktok"],
    deliveryDays: 3,
    clipLength: ["15 à 45 secondes", "15 to 45 seconds"],
    features: [
      ["Sous-titres et accroche sur chaque clip", "Compte TikTok créé et géré pour vous", "Vos clips et vos vues dans votre espace"],
      ["Captions and a hook on every clip", "TikTok account created and run for you", "Your clips and views in your space"],
    ],
    details: details(
      {
        who: "Pour découvrir le clipping avec un premier compte TikTok.",
        items: ["100 clips par mois (environ 3 par jour).", "Des clips de 15 à 45 secondes, sous-titrés.", "1 compte TikTok créé et géré pour vous.", "Livraison sous 3 jours."],
        clips: 100,
      },
      {
        who: "To discover clipping with a first TikTok account.",
        items: ["100 clips a month (about 3 a day).", "15 to 45 second clips, with captions.", "1 TikTok account created and run for you.", "Delivery within 3 days."],
      },
    ),
  },
  {
    slug: "croissance",
    name: ["Croissance", "Growth"],
    tagline: ["Grandir sur deux plateformes.", "Grow on two platforms."],
    description: ["Environ 7 clips par jour sur TikTok et YouTube Shorts.", "About 7 clips a day on TikTok and YouTube Shorts."],
    clips: 200,
    accounts: 2,
    platforms: ["tiktok", "youtube"],
    deliveryDays: 2,
    clipLength: ["15 à 60 secondes", "15 to 60 seconds"],
    features: [
      ["2 comptes dédiés (TikTok et Shorts)", "Vos consignes de style respectées", "Validation des clips si vous le souhaitez"],
      ["2 dedicated accounts (TikTok and Shorts)", "Your style guidelines respected", "Approve clips if you want"],
    ],
    details: details(
      {
        who: "Pour les créateurs qui publient chaque semaine et veulent toucher plus de monde.",
        items: ["200 clips par mois (environ 7 par jour).", "Des clips de 15 à 60 secondes, sous-titrés.", "2 comptes dédiés : TikTok et YouTube Shorts.", "Livraison sous 2 jours."],
        clips: 200,
      },
      {
        who: "For creators who post every week and want to reach more people.",
        items: ["200 clips a month (about 7 a day).", "15 to 60 second clips, with captions.", "2 dedicated accounts: TikTok and YouTube Shorts.", "Delivery within 2 days."],
      },
    ),
    featured: true,
  },
  {
    slug: "pro",
    name: ["Pro", "Pro"],
    tagline: ["Être partout, tous les jours.", "Be everywhere, every day."],
    description: ["Environ 13 clips par jour sur TikTok, Reels et Shorts.", "About 13 clips a day on TikTok, Reels and Shorts."],
    clips: 400,
    accounts: 3,
    platforms: ["tiktok", "instagram", "youtube"],
    deliveryDays: 2,
    clipLength: ["15 à 60 secondes", "15 to 60 seconds"],
    features: [
      ["3 comptes dédiés (TikTok, Reels, Shorts)", "Calendrier de publication par plateforme", "Demandes traitées en priorité"],
      ["3 dedicated accounts (TikTok, Reels, Shorts)", "Publishing schedule per platform", "Requests handled first"],
    ],
    details: details(
      {
        who: "Pour être visible partout où votre public regarde des vidéos courtes.",
        items: ["400 clips par mois (environ 13 par jour).", "Des clips de 15 à 60 secondes, sous-titrés.", "3 comptes dédiés : TikTok, Reels et Shorts.", "Livraison sous 2 jours, demandes traitées en priorité."],
        clips: 400,
      },
      {
        who: "To be visible everywhere your audience watches short videos.",
        items: ["400 clips a month (about 13 a day).", "15 to 60 second clips, with captions.", "3 dedicated accounts: TikTok, Reels and Shorts.", "Delivery within 2 days, requests handled first."],
      },
    ),
  },
  {
    slug: "elite",
    name: ["Élite", "Elite"],
    tagline: ["Le volume maximum.", "Maximum volume."],
    description: ["20 clips par jour, 5 comptes, livraison sous 24 h.", "20 clips a day, 5 accounts, delivery within 24 h."],
    clips: 600,
    accounts: 5,
    platforms: ["tiktok", "instagram", "youtube"],
    deliveryDays: 1,
    clipLength: ["15 à 90 secondes", "15 to 90 seconds"],
    features: [
      ["5 comptes dédiés sur TikTok, Reels et Shorts", "Livraison sous 24 h", "Un interlocuteur dédié"],
      ["5 dedicated accounts on TikTok, Reels and Shorts", "Delivery within 24 h", "A dedicated contact"],
    ],
    details: details(
      {
        who: "Pour les gros streamers et podcasts qui produisent beaucoup.",
        items: ["600 clips par mois (20 par jour).", "Des clips de 15 à 90 secondes, sous-titrés.", "5 comptes dédiés sur TikTok, Reels et Shorts.", "Livraison sous 24 h et un interlocuteur dédié."],
        clips: 600,
      },
      {
        who: "For big streamers and podcasts that produce a lot.",
        items: ["600 clips a month (20 a day).", "15 to 90 second clips, with captions.", "5 dedicated accounts on TikTok, Reels and Shorts.", "Delivery within 24 h and a dedicated contact."],
      },
    ),
  },
];

/** Prix d'un clip, en centimes. */
export const PRICE_PER_CLIP_CENTS = 99;

export const CATALOG: PlanRow[] = OFFERS.map((o, i) => ({
  id: `${CATALOG_PREFIX}${o.slug}`,
  name_fr: o.name[0],
  name_en: o.name[1],
  description_fr: o.description[0],
  description_en: o.description[1],
  price_cents: o.clips * PRICE_PER_CLIP_CENTS,
  currency: "EUR",
  billing_period: "mensuel",
  clips_per_period: o.clips,
  accounts_included: o.accounts,
  platforms: o.platforms,
  delivery_days: o.deliveryDays,
  features_fr: o.features[0],
  features_en: o.features[1],
  sort_order: (i + 1) * 10,
  is_visible: true,
  is_featured: !!o.featured,
  is_demo: false,
  slug: o.slug,
  tagline_fr: o.tagline[0],
  tagline_en: o.tagline[1],
  clip_length_fr: o.clipLength[0],
  clip_length_en: o.clipLength[1],
  details_fr: o.details[0],
  details_en: o.details[1],
}));

/** Offres de la vitrine : celles de la base si elle en a, sinon le catalogue intégré. */
export async function getPublicPlans(): Promise<PlanRow[]> {
  const plans = await getVisiblePlans();
  return plans.some((p) => p.slug) ? plans : CATALOG;
}
