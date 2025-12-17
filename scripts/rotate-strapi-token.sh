#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONT_ENV="$PROJECT_ROOT/frontend/.env.local"

echo "🔐 Rotating Strapi API token..."

NEW_TOKEN="$(openssl rand -hex 48)"
echo "→ New token generated"

docker compose stop strapi >/dev/null || true

docker compose run --rm strapi sh -lc "NEW_TOKEN='$NEW_TOKEN' npx strapi console <<'CONSOLE'
const token = process.env.NEW_TOKEN;

await strapi.query('admin::api-token').deleteMany({ where: {} });

await strapi.query('admin::api-token').create({
  data: {
    name: 'frontend-auto-rotated',
    description: 'Auto rotated from script',
    type: 'full-access',
    accessKey: token,
  },
});

console.log('→ Strapi token replaced');
.exit
CONSOLE"

docker compose start strapi >/dev/null || true

cp "$FRONT_ENV" "$FRONT_ENV.bak_$(date +%Y%m%d_%H%M%S)"
sed -i '' "s/^STRAPI_TOKEN=.*/STRAPI_TOKEN=$NEW_TOKEN/" "$FRONT_ENV"

echo "→ frontend/.env.local updated"

cd "$PROJECT_ROOT/frontend"
pkill -f "next dev" || true
rm -rf .next
nohup npm run dev >/dev/null 2>&1 &

echo "✅ Token rotation complete"
