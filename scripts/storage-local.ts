/**
 * Stockage vidéo local, compatible S3/R2 (s3rver), pour développer et tester
 * l'envoi de vidéos sans compte Cloudflare. Les fichiers sont écrits dans
 * `.storage-local/`. Laisser tourner dans un terminal (`npm run storage:start`).
 */
import { mkdirSync } from "node:fs";
import S3rver from "s3rver";

const PORT = 9000;
const BUCKET = process.env.S3_BUCKET ?? "peak-videos";
const DIRECTORY = ".storage-local";

// Envoi depuis le navigateur : ETag doit être exposé pour l'envoi en plusieurs parties.
const CORS = `<CORSConfiguration><CORSRule><AllowedOrigin>*</AllowedOrigin>${["GET", "PUT", "POST", "DELETE", "HEAD"]
  .map((m) => `<AllowedMethod>${m}</AllowedMethod>`)
  .join("")}<AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader></CORSRule></CORSConfiguration>`;

async function main() {
  mkdirSync(DIRECTORY, { recursive: true });
  const server = new S3rver({
    port: PORT,
    address: "127.0.0.1",
    silent: true,
    directory: DIRECTORY,
    configureBuckets: [{ name: BUCKET, configs: [CORS] }],
  });
  await server.run();
  console.log(`Stockage vidéo local prêt : http://127.0.0.1:${PORT} (bucket « ${BUCKET} »). Ctrl+C pour arrêter.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
