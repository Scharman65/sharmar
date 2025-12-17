#!/usr/bin/env bash
set -euo pipefail

echo "== Stop Next.js =="
pkill -f "next dev" >/dev/null 2>&1 || true

echo "== Stop Docker =="
docker compose down

echo "OK: stopped"
