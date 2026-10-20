import { z } from "zod";

export const PRIORITIES = ["basse", "normale", "haute"] as const;

const videoMeta = {
  title: z.string().trim().max(200, { message: "tooLong" }),
  notes: z.string().trim().max(3000, { message: "tooLong" }),
  priority: z.enum(PRIORITIES),
  recordedAt: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "date" }),
};

// Vidéo envoyée par lien (YouTube, Twitch, Drive, WeTransfer, Dropbox…) :
// le lien est seulement enregistré, le serveur ne télécharge rien.
export const videoLinkSchema = z.object({
  ...videoMeta,
  url: z
    .string()
    .trim()
    .min(1, { message: "required" })
    .max(1000, { message: "tooLong" })
    .refine((v) => /^https:\/\/[^\s]+\.[^\s]+$/i.test(v), { message: "url" }),
});
export type VideoLinkInput = z.infer<typeof videoLinkSchema>;

export const videoFileSchema = z.object({
  ...videoMeta,
  fileName: z.string().trim().min(1).max(250),
  mimeType: z.string().max(100),
  size: z.number().int().positive(),
});
export type VideoFileInput = z.infer<typeof videoFileSchema>;

export const LINK_HOSTS = ["youtube.com", "youtu.be", "twitch.tv", "kick.com", "drive.google.com", "wetransfer.com", "we.tl", "dropbox.com"];

/** Le lien vient-il d'un service connu ? (simple indication pour l'interface) */
export function knownLinkHost(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return LINK_HOSTS.find((h) => host === h || host.endsWith(`.${h}`)) ?? null;
  } catch {
    return null;
  }
}
