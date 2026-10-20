/**
 * Stockage vidéo local (MinIO, compatible S3/R2) : crée le bucket et active
 * l'accès depuis le navigateur. À lancer après `npm run storage:start`.
 */
import { CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const bucket = process.env.S3_BUCKET ?? "peak-videos";
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "auto",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [{ AllowedOrigins: ["*"], AllowedMethods: ["GET", "PUT", "POST", "DELETE"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"] }],
        },
      }),
    );
  } catch {
    // MinIO autorise déjà toutes les origines par défaut.
  }
  console.log(`Bucket « ${bucket} » prêt.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
