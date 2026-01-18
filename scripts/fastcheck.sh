#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Sharmar fastcheck =="
echo "root: $ROOT"
echo

if [ -d "$ROOT/frontend" ]; then
  echo "== frontend: typecheck =="
  cd "$ROOT/frontend"
  if [ -f package.json ]; then
    if [ -d node_modules ]; then :; else
      echo "NOTE: node_modules missing; run install first"
    fi
    npx tsc --noEmit
  else
    echo "SKIP: frontend/package.json not found"
  fi
  echo
else
  echo "SKIP: frontend dir not found"
  echo
fi

if [ -d "$ROOT/cms" ]; then
  echo "== cms: sanity (package manager presence) =="
  cd "$ROOT/cms"
  if [ -f package.json ]; then
    node -v
    echo "OK: cms package.json present"
  else
    echo "SKIP: cms/package.json not found"
  fi
  echo
else
  echo "SKIP: cms dir not found"
  echo
fi

echo "OK: fastcheck complete"
