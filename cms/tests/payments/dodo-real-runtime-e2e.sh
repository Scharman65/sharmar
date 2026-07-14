#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

node cms/tests/payments/dodo-real-runtime-e2e.mjs
