// Champs des contenus sous forme de liste (édités ligne par ligne dans l'admin).
export const LIST_FIELDS = {
  "home.stats": ["value", "label"],
  "home.testimonials": ["quote", "name", "handle"],
} as const;

export type ListFieldsKey = keyof typeof LIST_FIELDS;

export const CONTENT_GROUPS = {
  home: [
    "home.hero.eyebrow",
    "home.hero.title",
    "home.hero.lead",
    "home.stats",
  ],
  pricing: ["pricing.title", "pricing.lead", "pricing.note", "contact.lead"],
  legal: ["legal.notice", "legal.terms", "legal.privacy", "legal.clippers"],
} as const;

export type ContentGroup = keyof typeof CONTENT_GROUPS;
export const ALL_CONTENT_KEYS: readonly string[] = Object.values(CONTENT_GROUPS).flat();
