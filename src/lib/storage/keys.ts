import { safeFileName } from "@/lib/validation/client";

/** Clé de stockage, toujours générée par le serveur : dossier par client et par élément. */
export function objectKey(purpose: "video" | "clip", clientId: string, entityId: string, fileName: string): string {
  return `${purpose === "video" ? "videos" : "clips"}/${clientId}/${entityId}/${safeFileName(fileName)}`;
}

export const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/x-msvideo"] as const;

/** Type MIME accepté (certains navigateurs n'en donnent pas pour .mkv). */
export function normalizeVideoMime(mime: string, fileName: string): string | null {
  if ((VIDEO_MIME_TYPES as readonly string[]).includes(mime)) return mime;
  const ext = fileName.toLowerCase().split(".").pop();
  const byExt: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", mkv: "video/x-matroska", webm: "video/webm", avi: "video/x-msvideo" };
  return ext && byExt[ext] ? byExt[ext] : null;
}
