#!/usr/bin/env bash
set -euo pipefail

echo "== Docker =="
docker compose ps

echo
echo "== Strapi (admin) =="
curl -sS -I http://127.0.0.1:1337/admin | head -n 5

echo
echo "== Strapi API with token =="
if [ -f ./frontend/.env.local ]; then
  set -a
  source ./frontend/.env.local
  set +a
else
  echo "ERROR: ./frontend/.env.local not found"
  exit 1
fi

echo "STRAPI_URL=$STRAPI_URL"
echo "STRAPI_TOKEN_len=${#STRAPI_TOKEN}"

code="$(curl --globoff -sS -o /tmp/boats_api_check.json -w "%{http_code}\n" \
  -H "Authorization: Bearer $STRAPI_TOKEN" \
  "$STRAPI_URL/api/boats?pagination[pageSize]=1")"
echo "boats_api_http=$code"

python3 - <<'PY'
import json
from pathlib import Path
p=Path("/tmp/boats_api_check.json")
try:
    j=json.loads(p.read_text("utf-8"))
    n=len(j.get("data") or [])
    first=(j.get("data") or [{}])[0]
    title=first.get("title")
    slug=first.get("slug")
    print(f"boats_count={n}")
    print(f"first_title={title}")
    print(f"first_slug={slug}")
except Exception as e:
    print("JSON parse error:", e)
    print(p.read_text("utf-8")[:300])
PY

echo
echo "== Next.js =="
curl -sS -I http://localhost:3000/en/boats | head -n 8

echo
echo "== Next log tail (/tmp/next.log) =="
if [ -f /tmp/next.log ]; then
  tail -n 60 /tmp/next.log
else
  echo "(no /tmp/next.log yet)"
fi
