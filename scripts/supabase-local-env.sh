#!/usr/bin/env bash
# Écrit .env.local à partir de l'instance Supabase locale (`npx supabase start`).
set -euo pipefail
status_json="$(npx supabase status -o json)"
get() { node -e "const s=JSON.parse(process.argv[1]); process.stdout.write(s[process.argv[2]] ?? '')" "$status_json" "$1"; }
cat > .env.local <<ENV
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=$(get API_URL)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(get ANON_KEY)
SUPABASE_SECRET_KEY=$(get SERVICE_ROLE_KEY)
# Stockage vidéo local (MinIO, voir « npm run storage:start »)
S3_ENDPOINT=http://127.0.0.1:9000
S3_REGION=auto
S3_ACCESS_KEY_ID=peaklocal
S3_SECRET_ACCESS_KEY=peaklocal-secret
S3_BUCKET=peak-videos
S3_FORCE_PATH_STYLE=true
ENV
echo ".env.local écrit pour Supabase local ($(get API_URL))."
