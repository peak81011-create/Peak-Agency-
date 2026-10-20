// Champs des contenus sous forme de liste (édités ligne par ligne dans l'admin).
export const LIST_FIELDS = {
  "home.steps": ["title", "body"],
  "home.stats": ["value", "label"],
  "home.testimonials": ["quote", "name", "handle"],
  "home.faq": ["q", "a"],
} as const;

export type ListFieldsKey = keyof typeof LIST_FIELDS;

export const CONTENT_GROUPS = {
  home: [
    "home.hero.eyebrow",
    "home.hero.title",
    "home.hero.lead",
    "home.how.title",
    "home.how.lead",
    "home.steps",
    "home.stats",
    "home.testimonials",
    "home.faq",
    "home.cta.title",
  ],
  pricing: ["pricing.title", "pricing.lead", "pricing.note", "contact.lead"],
  legal: ["legal.notice", "legal.terms", "legal.privacy"],
} as const;

export type ContentGroup = keyof typeof CONTENT_GROUPS;
export const ALL_CONTENT_KEYS: readonly string[] = Object.values(CONTENT_GROUPS).flat();
