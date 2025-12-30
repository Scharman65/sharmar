#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker compose ps >/dev/null 2>&1; then
  echo "ERROR: docker compose недоступен или не в папке проекта."
  exit 1
fi

TS="$(date +%Y-%m-%d_%H-%M-%S)"
BK="backups/$TS"
mkdir -p "$BK"

echo "Backup dir: $BK"

echo "1) Postgres dump..."
docker compose exec -T db pg_dump -U sharmar -d sharmar --format=custom > "$BK/postgres.dump"
ls -lh "$BK/postgres.dump"

echo "2) Project archive (без node_modules/.next/build/cache/backups)..."
tar -czf "$BK/project.tgz" \
  --exclude='./cms/node_modules' \
  --exclude='./frontend/node_modules' \
  --exclude='./frontend/.next' \
  --exclude='./cms/.cache' \
  --exclude='./cms/build' \
  --exclude='./backups' \
  .
ls -lh "$BK/project.tgz"

echo "3) Docker volumes archive (pg_data + cms_node_modules)..."
VOL_TAR="$BK/docker_volumes.tgz"
docker run --rm \
  -v "$(pwd)":/work \
  -v sharmar_sharmar_pg_data:/vol/pg_data \
  -v sharmar_sharmar_cms_node_modules:/vol/cms_node_modules \
  alpine sh -lc "cd /vol && tar -czf /work/$VOL_TAR ."
ls -lh "$VOL_TAR"

echo "OK: backup completed: $BK"
