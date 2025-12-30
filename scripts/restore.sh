#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

BK="${1:-}"
if [ -z "$BK" ]; then
  echo "Usage: scripts/restore.sh backups/YYYY-MM-DD_HH-MM-SS"
  exit 1
fi

if [ ! -d "$BK" ]; then
  echo "ERROR: backup dir not found: $BK"
  exit 1
fi

if [ ! -f "$BK/postgres.dump" ] || [ ! -f "$BK/project.tgz" ] || [ ! -f "$BK/docker_volumes.tgz" ]; then
  echo "ERROR: backup incomplete in $BK (need postgres.dump, project.tgz, docker_volumes.tgz)"
  exit 1
fi

echo "RESTORE FROM: $BK"
echo "1) Stop containers..."
docker compose down

echo "2) Restore project files (поверх текущих, без удаления)..."
tar -xzf "$BK/project.tgz"

echo "3) Recreate volumes..."
docker volume rm -f sharmar_sharmar_pg_data sharmar_sharmar_cms_node_modules >/dev/null 2>&1 || true
docker volume create sharmar_sharmar_pg_data >/dev/null
docker volume create sharmar_sharmar_cms_node_modules >/dev/null

echo "4) Restore volumes content..."
docker run --rm \
  -v "$(pwd)":/work \
  -v sharmar_sharmar_pg_data:/vol/pg_data \
  -v sharmar_sharmar_cms_node_modules:/vol/cms_node_modules \
  alpine sh -lc "cd /vol && rm -rf ./* && tar -xzf /work/$BK/docker_volumes.tgz"

echo "5) Start db..."
docker compose up -d db

echo "6) Restore postgres dump into db..."
docker compose exec -T db bash -lc '
set -e
pg_restore -U sharmar -d sharmar --clean --if-exists --no-owner --no-privileges
' < "$BK/postgres.dump"

echo "7) Start strapi..."
docker compose up -d strapi

echo "OK: restore finished."
echo "Check: docker compose ps"
