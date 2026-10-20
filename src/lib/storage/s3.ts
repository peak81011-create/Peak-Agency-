import "server-only";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

// Stockage des vidéos (sources et clips) : Cloudflare R2 en production,
// MinIO en local et dans la CI. Toujours privé : lecture et écriture
// uniquement par URL signée de courte durée, créée après contrôle des droits.

const envSchema = z.object({
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
});

let cached: { client: S3Client; bucket: string } | null | undefined;

/** Client S3, ou null si le stockage vidéo n'est pas configuré. */
export function videoStorage(): { client: S3Client; bucket: string } | null {
  if (cached !== undefined) return cached;
  const parsed = envSchema.safeParse({
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION || undefined,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE || undefined,
  });
  if (!parsed.success) {
    cached = null;
    return cached;
  }
  const env = parsed.data;
  cached = {
    bucket: env.S3_BUCKET,
    client: new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
    }),
  };
  return cached;
}

export function isVideoStorageConfigured(): boolean {
  return videoStorage() !== null;
}

const SIGN_SECONDS = 15 * 60;

export type SignableRequest =
  | { method: "PUT"; key: string; contentType?: string; uploadId?: undefined; partNumber?: undefined }
  | { method: "PUT"; key: string; uploadId: string; partNumber: number }
  | { method: "POST"; key: string; uploadId?: string }
  | { method: "GET"; key: string; uploadId: string }
  | { method: "DELETE"; key: string; uploadId: string };

/** URL signée pour une opération d'envoi (simple ou en plusieurs parties). */
export async function presignUpload(request: SignableRequest): Promise<{ url: string; headers?: Record<string, string> }> {
  const storage = videoStorage();
  if (!storage) throw new Error("Stockage vidéo non configuré");
  const { client, bucket } = storage;
  const Key = request.key;
  const opts = { expiresIn: SIGN_SECONDS };

  if (request.method === "PUT" && request.uploadId) {
    const command = new UploadPartCommand({ Bucket: bucket, Key, UploadId: request.uploadId, PartNumber: request.partNumber });
    return { url: await getSignedUrl(client, command, opts) };
  }
  if (request.method === "PUT") {
    const contentType = ("contentType" in request && request.contentType) || "application/octet-stream";
    const command = new PutObjectCommand({ Bucket: bucket, Key, ContentType: contentType });
    return { url: await getSignedUrl(client, command, opts), headers: { "content-type": contentType } };
  }
  if (request.method === "POST" && request.uploadId) {
    return { url: await getSignedUrl(client, new CompleteMultipartUploadCommand({ Bucket: bucket, Key, UploadId: request.uploadId }), opts) };
  }
  if (request.method === "POST") {
    return { url: await getSignedUrl(client, new CreateMultipartUploadCommand({ Bucket: bucket, Key }), opts) };
  }
  if (request.method === "GET") {
    return { url: await getSignedUrl(client, new ListPartsCommand({ Bucket: bucket, Key, UploadId: request.uploadId }), opts) };
  }
  return { url: await getSignedUrl(client, new AbortMultipartUploadCommand({ Bucket: bucket, Key, UploadId: request.uploadId }), opts) };
}

/** Taille réelle de l'objet stocké (null s'il n'existe pas). */
export async function objectSize(key: string): Promise<number | null> {
  const storage = videoStorage();
  if (!storage) return null;
  try {
    const head = await storage.client.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: key }));
    return head.ContentLength ?? 0;
  } catch {
    return null;
  }
}

/** Lien de téléchargement (ou de lecture) valable 15 minutes. */
export async function presignDownload(key: string, fileName?: string, inline = false): Promise<string> {
  const storage = videoStorage();
  if (!storage) throw new Error("Stockage vidéo non configuré");
  const safe = (fileName ?? key.split("/").pop() ?? "video").replace(/[^\w.\- ]+/g, "_");
  return getSignedUrl(
    storage.client,
    new GetObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename="${safe}"`,
    }),
    { expiresIn: SIGN_SECONDS },
  );
}
