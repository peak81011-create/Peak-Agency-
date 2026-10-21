import { z } from "zod";

const optionalDateTime = z.string().refine((v) => v === "" || !Number.isNaN(Date.parse(v)), { message: "date" });
const optionalUrl = z
  .string()
  .trim()
  .max(1000, { message: "tooLong" })
  .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), { message: "url" });
const timecode = z
  .string()
  .trim()
  .refine((v) => v === "" || /^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(v), { message: "timecode" });

export const CLIP_STATUSES = ["planifie", "en_montage", "a_valider", "valide", "programme", "publie", "rejete"] as const;

export const clipFormSchema = z.object({
  clientId: z.uuid({ message: "required" }),
  title: z.string().trim().min(1, { message: "required" }).max(200, { message: "tooLong" }),
  hook: z.string().trim().max(80, { message: "tooLong" }),
  caption: z.string().trim().max(2200, { message: "tooLong" }),
  hashtags: z.string().trim().max(500, { message: "tooLong" }),
  start: timecode,
  end: timecode,
  sourceVideoId: z.string(),
  socialAccountId: z.string(),
  clipperId: z.string(),
  dueAt: optionalDateTime,
  scheduledAt: optionalDateTime,
  publishedUrl: optionalUrl,
});
export type ClipFormInput = z.infer<typeof clipFormSchema>;

/** « 1:05:30 » ou « 05:30 » → secondes ; chaîne vide → null. */
export function parseTimecode(value: string): number | null {
  if (!value) return null;
  return value
    .split(":")
    .map(Number)
    .reduce((acc, n) => acc * 60 + n, 0);
}

export function formatTimecode(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** « #live, fou rire » → ["live", "fourire"] */
export function parseHashtags(value: string): string[] {
  return [...new Set(value.split(/[\s,]+/).map((h) => h.replace(/^#/, "").replace(/[^\p{L}\p{N}_]/gu, "")).filter(Boolean))].slice(0, 30);
}

export const PLATFORMS_ALL = ["tiktok", "instagram", "youtube", "autre"] as const;
export const ACCOUNT_STATUSES = ["actif", "en_croissance", "bloque", "abandonne"] as const;

export const accountFormSchema = z.object({
  clientId: z.uuid({ message: "required" }),
  platform: z.enum(PLATFORMS_ALL),
  handle: z.string().trim().min(1, { message: "required" }).max(100, { message: "tooLong" }),
  url: optionalUrl,
  ownerEmployeeId: z.string(),
  createdOn: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "date" }),
  status: z.enum(ACCOUNT_STATUSES),
  followersCount: z.string().trim().regex(/^\d{0,10}$/, { message: "number" }),
  passwordManagerRef: z.string().trim().max(300, { message: "tooLong" }),
  notes: z.string().trim().max(3000, { message: "tooLong" }),
});
export type AccountFormInput = z.infer<typeof accountFormSchema>;

export const inviteClientSchema = z.object({
  email: z.email({ message: "email" }),
  fullName: z.string().trim().min(1, { message: "required" }).max(120, { message: "tooLong" }),
  creatorName: z.string().trim().min(1, { message: "required" }).max(120, { message: "tooLong" }),
  locale: z.enum(["fr", "en"]),
});
export type InviteClientInput = z.infer<typeof inviteClientSchema>;
