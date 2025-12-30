#!/usr/bin/env bash
set -euo pipefail

EMAIL="${1:-}"
PASS="${2:-}"

if [ -z "$EMAIL" ] || [ -z "$PASS" ]; then
  echo "Usage: ./scripts/admin_login.sh <email> <password>"
  exit 1
fi

curl -sS --globoff \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  http://127.0.0.1:1337/admin/login \
| python3 - <<'PY'
import sys, json
j=json.load(sys.stdin)
if j.get("data") and j["data"].get("token"):
    print("OK: admin login token_len=", len(j["data"]["token"]))
else:
    print("ERROR:", j.get("error"))
PY
