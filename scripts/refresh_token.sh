#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/refresh_token.py
./scripts/healthcheck.sh
