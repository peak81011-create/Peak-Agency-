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
ENV
echo ".env.local écrit pour Supabase local ($(get API_URL))."
