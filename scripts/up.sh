#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== Up Strapi + DB =="
docker compose up -d

echo
echo "== Start Next dev =="
pkill -f "next dev" >/dev/null 2>&1 || true
rm -f /tmp/next.log

cd frontend
npm run dev >/tmp/next.log 2>&1 &
cd ..

sleep 1

echo
./scripts/healthcheck.sh
