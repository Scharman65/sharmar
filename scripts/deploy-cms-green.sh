#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sharmar/app}"
ACTIVE_CMS_SOURCE="${ACTIVE_CMS_SOURCE:-$APP_DIR/cms_green}"
EXTERNAL_ENV="${EXTERNAL_ENV:-$APP_DIR/shared/cms_green.env}"
PAYMENTS_ENV="${PAYMENTS_ENV:-$APP_DIR/.env.strapi_green_payments}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_DIR/docker-compose.yml}"
COMPOSE_GREEN="${COMPOSE_GREEN:-$APP_DIR/docker-compose.green.yml}"
CMS_SERVICE="${CMS_SERVICE:-strapi_green}"
CMS_CONTAINER="${CMS_CONTAINER:-sharmar_strapi_green}"
DB_CONTAINER="${DB_CONTAINER:-sharmar_pg}"
DEPLOY_DIR="${DEPLOY_DIR:-$APP_DIR/.deploy}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/sharmar/backups}"
SSH_BIN="${SSH_BIN:-ssh}"
SCP_BIN="${SCP_BIN:-scp}"
REQUIRED_ENV_KEYS=(ADMIN_JWT_SECRET APP_KEYS API_TOKEN_SALT TRANSFER_TOKEN_SALT JWT_SECRET)

usage() {
  cat <<'USAGE'
Usage:
  scripts/deploy-cms-green.sh --server root@91.98.125.132 --commit <full-sha> [--dry-run]

  SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES \
  scripts/deploy-cms-green.sh --server root@91.98.125.132 --commit <full-sha> --apply

  SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES \
  scripts/deploy-cms-green.sh --server root@91.98.125.132 --commit <full-sha> --apply --bootstrap-external-env

Default mode is dry-run. Apply mode requires SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES.
The script never prints secret values and never performs frontend deployment.
USAGE
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

log() {
  printf '%s\n' "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

is_full_sha() {
  [[ "$1" =~ ^[0-9a-f]{40}$ ]]
}

valid_server() {
  [[ "$1" =~ ^[A-Za-z0-9._-]+@[A-Za-z0-9._:-]+$ ]]
}

repo_root() {
  git rev-parse --show-toplevel
}

assert_repo_root() {
  local root
  root="$(cd "$(repo_root)" && pwd -P)"
  [ "$(pwd -P)" = "$root" ] || die "run from repository root: $root"
  [ -f docker-compose.green.yml ] || die "tracked docker-compose.green.yml is missing"
  [ -f scripts/deploy-cms-green.sh ] || die "deployment script missing"
  [ -f scripts/tests/test-deploy-cms-green.sh ] || die "deployment tests missing"
}

assert_clean_worktree() {
  [ -z "$(git status --porcelain)" ] || die "worktree is not clean"
}

is_runtime_env_path() {
  local path="$1"
  local base
  base="${path##*/}"

  case "$base" in
    cms_green.env*) return 0 ;;
  esac

  case "$path" in
    shared/*.env|*/shared/*.env) return 0 ;;
  esac

  if [[ "$base" == .env* ]]; then
    case "$base" in
      *.example) return 1 ;;
      *) return 0 ;;
    esac
  fi

  return 1
}

assert_no_tracked_envs() {
  local path
  while IFS= read -r -d '' path; do
    if is_runtime_env_path "$path"; then
      die "tracked runtime env file detected: $path"
    fi
  done < <(git ls-files -z)
}

validate_local_commit() {
  local commit="$1"
  is_full_sha "$commit" || die "--commit must be a full 40-character lowercase SHA"
  git rev-parse --verify "$commit^{commit}" >/dev/null || die "commit does not exist: $commit"
  git merge-base --is-ancestor "$commit" HEAD || die "commit is not an ancestor of HEAD: $commit"
  git diff --check >/dev/null
}

validate_env_file_local() {
  local file="$1"
  [ -f "$file" ] || die "env file missing: $file"
  [ ! -L "$file" ] || die "env file must be a regular file, not symlink: $file"
  [ -r "$file" ] || die "env file is not readable: $file"
  local mode
  mode="$(stat -f '%Lp' "$file" 2>/dev/null || stat -c '%a' "$file")"
  case "$mode" in
    400|600) ;;
    *) die "env file mode is unsafe: $mode" ;;
  esac
  local key
  for key in "${REQUIRED_ENV_KEYS[@]}"; do
    awk -F= -v key="$key" '
      $0 ~ /^[[:space:]]*#/ { next }
      $1 == key {
        value = substr($0, length($1) + 2)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
        gsub(/^["'\'']|["'\'']$/, "", value)
        if (length(value) > 0) found = 1
      }
      END { exit(found ? 0 : 1) }
    ' "$file" || die "$key is missing or empty"
  done
}

make_archive() {
  local commit="$1"
  local out="$2"
  local path
  git archive --format=tar "$commit" cms > "$out"
  tar -tf "$out" >/dev/null
  tar -tf "$out" | grep -q '^cms/' || die "archive does not contain cms/"
  while IFS= read -r path; do
    case "$path" in
      backups/*|*/backup/*|*/backups/*) die "archive contains forbidden backup path: $path" ;;
    esac
    if is_runtime_env_path "$path"; then
      die "archive contains forbidden runtime env path: $path"
    fi
  done < <(tar -tf "$out")
}

remote_readonly_baseline() {
  local server="$1"
  "$SSH_BIN" -T -- "$server" "bash -s" <<'REMOTE'
set -euo pipefail
echo PHASE_2_REMOTE_BASELINE
printf 'DISK_ROOT='; df -P /opt/sharmar/app | awk 'NR==2 {print $5}'
printf 'CMS_CONTAINER_RUNNING='; docker inspect -f '{{.State.Running}}' sharmar_strapi_green | awk '{print ($1=="true"?"YES":"NO")}'
printf 'CMS_RESTART_COUNT='; docker inspect -f '{{.RestartCount}}' sharmar_strapi_green
printf 'DB_CONTAINER_RUNNING='; docker inspect -f '{{.State.Running}}' sharmar_pg | awk '{print ($1=="true"?"YES":"NO")}'
printf 'CMS_LOCAL_HTTP='; curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:1338/admin
printf 'PUBLIC_API_HTTP='; curl -sS -o /dev/null -w '%{http_code}\n' https://api.sharmar.me/api/boats
printf 'ACTIVE_SOURCE='; readlink -f /opt/sharmar/app/cms_green
printf 'COMPOSE_SHA256='; sha256sum /opt/sharmar/app/docker-compose.green.yml | awk '{print $1}'
printf 'EXTERNAL_ENV_PRESENT='; [ -f /opt/sharmar/app/shared/cms_green.env ] && echo YES || echo NO
printf 'EXTERNAL_ENV_MODE='; [ -f /opt/sharmar/app/shared/cms_green.env ] && stat -c '%a' /opt/sharmar/app/shared/cms_green.env || echo NONE
for key in ADMIN_JWT_SECRET APP_KEYS API_TOKEN_SALT TRANSFER_TOKEN_SALT JWT_SECRET; do
  printf '%s_NONEMPTY=' "$key"
  awk -F= -v key="$key" '$0 !~ /^[[:space:]]*#/ && $1 == key { v=substr($0,length($1)+2); gsub(/^[[:space:]]+|[[:space:]]+$/,"",v); gsub(/^["'\''"]|["'\''"]$/,"",v); if(length(v)>0) ok=1 } END { exit(ok?0:1) }' /opt/sharmar/app/shared/cms_green.env >/dev/null 2>&1 && echo YES || echo NO
done
docker exec sharmar_pg psql -U sharmar -d sharmar -Atc "select 'boats=' || count(*) from boats; select 'booking_requests=' || count(*) from booking_requests; select 'bookings=' || count(*) from bookings; select 'payments=' || count(*) from payments; select 'dodo_webhook_events=' || case when exists (select 1 from information_schema.tables where table_name='dodo_webhook_events') then (select count(*)::text from dodo_webhook_events) else 'TABLE_ABSENT' end;"
docker exec sharmar_pg psql -U sharmar -d sharmar -Atc "select 'propulsion_present=' || case when exists (select 1 from information_schema.columns where table_name='boats' and column_name='propulsion') then 'YES' else 'NO' end; select 'propulsion_nullable=' || case when exists (select 1 from information_schema.columns where table_name='boats' and column_name='propulsion' and is_nullable='YES') then 'YES' else 'NO' end;"
REMOTE
}

remote_env_gate() {
  local server="$1"
  "$SSH_BIN" -T -- "$server" "bash -s" <<'REMOTE'
set -euo pipefail
file=/opt/sharmar/app/shared/cms_green.env
[ -f "$file" ] || { echo EXTERNAL_ENV_PRESENT=NO; exit 20; }
[ ! -L "$file" ] || { echo EXTERNAL_ENV_REGULAR=NO; exit 20; }
owner="$(stat -c '%U' "$file")"
mode="$(stat -c '%a' "$file")"
[ "$owner" = root ] || { echo EXTERNAL_ENV_OWNER_OK=NO; exit 20; }
case "$mode" in 400|600) echo EXTERNAL_ENV_MODE_SAFE=YES ;; *) echo EXTERNAL_ENV_MODE_SAFE=NO; exit 20 ;; esac
for key in ADMIN_JWT_SECRET APP_KEYS API_TOKEN_SALT TRANSFER_TOKEN_SALT JWT_SECRET; do
  awk -F= -v key="$key" '$0 !~ /^[[:space:]]*#/ && $1 == key { v=substr($0,length($1)+2); gsub(/^[[:space:]]+|[[:space:]]+$/,"",v); gsub(/^["'\''"]|["'\''"]$/,"",v); if(length(v)>0) ok=1 } END { exit(ok?0:1) }' "$file" || { echo "${key}_NONEMPTY=NO"; exit 20; }
  echo "${key}_NONEMPTY=YES"
done
REMOTE
}

remote_apply_script() {
  cat <<'REMOTE'
set -euo pipefail
APP_DIR=/opt/sharmar/app
ACTIVE_CMS_SOURCE=$APP_DIR/cms_green
EXTERNAL_ENV=$APP_DIR/shared/cms_green.env
COMPOSE_FILE=$APP_DIR/docker-compose.yml
COMPOSE_GREEN=$APP_DIR/docker-compose.green.yml
PAYMENTS_ENV=$APP_DIR/.env.strapi_green_payments
CMS_SERVICE=strapi_green
CMS_CONTAINER=sharmar_strapi_green
DB_CONTAINER=sharmar_pg
DEPLOY_DIR=$APP_DIR/.deploy
BACKUP_ROOT=/opt/sharmar/backups
SWITCH_DONE=NO
COMPOSE_CHANGED=NO
PREVIOUS_SOURCE=
FAILED_SOURCE=
PREVIOUS_COMPOSE=
ROLLBACK_RESULT=NOT_REQUIRED

log() { printf '%s\n' "$*"; }
fail() { echo "ERROR: $*" >&2; exit 1; }

counts() {
  docker exec "$DB_CONTAINER" psql -U sharmar -d sharmar -Atc "select 'boats=' || count(*) from boats; select 'booking_requests=' || count(*) from booking_requests; select 'bookings=' || count(*) from bookings; select 'payments=' || count(*) from payments; select 'dodo_webhook_events=' || case when exists (select 1 from information_schema.tables where table_name='dodo_webhook_events') then (select count(*)::text from dodo_webhook_events) else 'TABLE_ABSENT' end; select 'propulsion_non_null=' || case when exists (select 1 from information_schema.columns where table_name='boats' and column_name='propulsion') then (select count(*)::text from boats where propulsion is not null) else 'COLUMN_ABSENT' end;"
}

health() {
  [ "$(docker inspect -f '{{.State.Running}}' "$CMS_CONTAINER")" = true ]
  [ "$(docker inspect -f '{{.RestartCount}}' "$CMS_CONTAINER")" = 0 ]
  [ "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:1338/admin)" = 200 ]
  [ "$(curl -sS -o /dev/null -w '%{http_code}' https://api.sharmar.me/api/boats)" = 200 ]
}

schema_gate() {
  docker exec "$DB_CONTAINER" psql -U sharmar -d sharmar -Atc "select case when exists (select 1 from information_schema.columns where table_name='boats' and column_name='propulsion' and is_nullable='YES') then 'YES' else 'NO' end;" | grep -qx YES
}

secret_gate() {
  local file="$EXTERNAL_ENV"
  [ -f "$file" ] && [ ! -L "$file" ] && [ -r "$file" ] || fail "external env missing or unreadable"
  [ "$(stat -c '%U' "$file")" = root ] || fail "external env owner must be root"
  case "$(stat -c '%a' "$file")" in 400|600) ;; *) fail "external env mode is unsafe" ;; esac
  for key in ADMIN_JWT_SECRET APP_KEYS API_TOKEN_SALT TRANSFER_TOKEN_SALT JWT_SECRET; do
    awk -F= -v key="$key" '$0 !~ /^[[:space:]]*#/ && $1 == key { v=substr($0,length($1)+2); gsub(/^[[:space:]]+|[[:space:]]+$/,"",v); gsub(/^["'\''"]|["'\''"]$/,"",v); if(length(v)>0) ok=1 } END { exit(ok?0:1) }' "$file" || fail "$key missing or empty"
  done
}

rollback() {
  local reason="${1:-unknown}"
  if [ "$SWITCH_DONE" != YES ]; then
    log "ROLLBACK_PERFORMED=NO"
    log "ROLLBACK_REASON=$reason"
    return 0
  fi
  log "PHASE_11_ROLLBACK_ON_ANY_FAILURE"
  log "ROLLBACK_REASON=$reason"
  local ts
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  FAILED_SOURCE="$DEPLOY_DIR/cms_green_failed_${ts}"
  if [ -d "$ACTIVE_CMS_SOURCE" ]; then
    mv "$ACTIVE_CMS_SOURCE" "$FAILED_SOURCE"
  fi
  if [ -n "$PREVIOUS_SOURCE" ] && [ -d "$PREVIOUS_SOURCE" ]; then
    mv "$PREVIOUS_SOURCE" "$ACTIVE_CMS_SOURCE"
  fi
  if [ "$COMPOSE_CHANGED" = YES ] && [ -n "$PREVIOUS_COMPOSE" ] && [ -f "$PREVIOUS_COMPOSE" ]; then
    install -m "$(stat -c '%a' "$PREVIOUS_COMPOSE")" "$PREVIOUS_COMPOSE" "$COMPOSE_GREEN"
  fi
  if docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_GREEN" up -d --no-deps --force-recreate "$CMS_SERVICE" && health; then
    log "ROLLBACK_PERFORMED=YES"
    log "ROLLBACK_RESULT=PASS"
    exit 1
  fi
  log "ROLLBACK_PERFORMED=YES"
  log "ROLLBACK_RESULT=FAIL"
  exit 90
}

trap 'rollback trapped_error' ERR
trap 'rollback trapped_signal' INT TERM

[ -n "${BACKUP_DIR:-}" ] || fail "BACKUP_DIR is required"
[ -d "$BACKUP_DIR" ] || fail "backup dir missing"
[ -f "$BACKUP_DIR/SHA256SUMS" ] || fail "backup checksums missing"
sha256sum -c "$BACKUP_DIR/SHA256SUMS" >/dev/null
tar -tzf "$BACKUP_DIR/uploads.tar.gz" >/dev/null
tar -tzf "$BACKUP_DIR/cms_green_source.tar.gz" >/dev/null
PREVIOUS_COMPOSE="$BACKUP_DIR/docker-compose.green.yml"

log PHASE_4_UPLOAD_AND_VALIDATE_COMPOSE
grep -q '/opt/sharmar/app/shared/cms_green.env' "$REMOTE_COMPOSE_TMP"
grep -q '.env.strapi_green_payments' "$REMOTE_COMPOSE_TMP"
! grep -Eiq '(ADMIN_JWT_SECRET|APP_KEYS|API_TOKEN_SALT|TRANSFER_TOKEN_SALT|JWT_SECRET)[[:space:]]*[:=][[:space:]]*[A-Za-z0-9_./+@-]{16,}' "$REMOTE_COMPOSE_TMP"
docker compose -f "$COMPOSE_FILE" -f "$REMOTE_COMPOSE_TMP" config --services >/dev/null
install -m "$(stat -c '%a' "$COMPOSE_GREEN")" "$REMOTE_COMPOSE_TMP" "$COMPOSE_GREEN"
COMPOSE_CHANGED=YES

log PHASE_5_UPLOAD_STAGE_ARCHIVE
mkdir -p "$DEPLOY_DIR"
stage_ts="$(date -u +%Y%m%dT%H%M%SZ)"
stage_path="$DEPLOY_DIR/cms_green_stage_${DEPLOY_COMMIT_SHORT}_${stage_ts}"
mkdir -p "$stage_path"
tar -xf "$REMOTE_ARCHIVE" -C "$DEPLOY_DIR"
mv "$DEPLOY_DIR/cms" "$stage_path/src"
[ ! -f "$stage_path/src/.env" ]

log PHASE_6_REMOTE_ISOLATED_BUILD
docker run --rm -v "$stage_path/src:/app" -v "sharmar_cms_node_modules_stage_${stage_ts}:/app/node_modules" -w /app node:20-bookworm-slim sh -lc 'npm ci && npm run build'

log PHASE_7_PRE_SWITCH_GATE
secret_gate
health
before_counts="$(counts)"
schema_before="$(docker exec "$DB_CONTAINER" psql -U sharmar -d sharmar -Atc "select case when exists (select 1 from information_schema.columns where table_name='boats' and column_name='propulsion' and is_nullable='YES') then 'YES' else 'NO' end;")"
[ -d "$ACTIVE_CMS_SOURCE" ]
[ -f "$PREVIOUS_COMPOSE" ]

log PHASE_8_SOURCE_SWITCH
previous_ts="$(date -u +%Y%m%dT%H%M%SZ)"
PREVIOUS_SOURCE="$DEPLOY_DIR/cms_green_previous_${previous_ts}"
mv "$ACTIVE_CMS_SOURCE" "$PREVIOUS_SOURCE"
mv "$stage_path/src" "$ACTIVE_CMS_SOURCE"
SWITCH_DONE=YES

log PHASE_9_RECREATE_CMS_ONLY
docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_GREEN" up -d --no-deps --force-recreate "$CMS_SERVICE"

log PHASE_10_POST_SWITCH_HEALTH_SCHEMA_DATA
for _ in $(seq 1 30); do
  if health >/dev/null 2>&1; then break; fi
  sleep 2
done
health || rollback health_timeout
schema_gate || rollback schema_failure
after_counts="$(counts)"
[ "$before_counts" = "$after_counts" ] || rollback database_count_mismatch
if [ "$schema_before" = YES ]; then
  log "PROPULSION_COLUMN_PREEXISTING=YES"
else
  log "PROPULSION_COLUMN_CREATED_BY_STRAPI=YES"
fi
log "ROLLBACK_PERFORMED=NO"
log "ROLLBACK_RESULT=NOT_REQUIRED"
log "CMS_GREEN_DEPLOY=PASS"
REMOTE
}

remote_bootstrap_external_env() {
  local server="$1"
  "$SSH_BIN" -T -- "$server" "bash -s" <<'REMOTE'
set -euo pipefail
src=/opt/sharmar/app/cms_green/.env
dst=/opt/sharmar/app/shared/cms_green.env
[ -f "$src" ] || { echo SOURCE_ENV_PRESENT=NO; exit 30; }
install -d -m 700 /opt/sharmar/app/shared
if [ -f "$dst" ]; then
  echo EXTERNAL_ENV_ALREADY_PRESENT=YES
else
  install -m 600 "$src" "$dst"
  chown root:root "$dst"
fi
[ "$(sha256sum "$src" | awk '{print $1}')" = "$(sha256sum "$dst" | awk '{print $1}')" ] || { echo EXTERNAL_ENV_CHECKSUM_MATCH=NO; exit 30; }
echo EXTERNAL_ENV_BOOTSTRAP=PASS
REMOTE
}

remote_backup() {
  local server="$1"
  "$SSH_BIN" -T -- "$server" "bash -s" <<'REMOTE'
set -euo pipefail
APP_DIR=/opt/sharmar/app
ACTIVE_CMS_SOURCE=$APP_DIR/cms_green
EXTERNAL_ENV=$APP_DIR/shared/cms_green.env
COMPOSE_GREEN=$APP_DIR/docker-compose.green.yml
DB_CONTAINER=sharmar_pg
BACKUP_ROOT=/opt/sharmar/backups
echo PHASE_3_BACKUP
ts="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/pre_cms_green_deploy_$ts"
install -d -m 700 "$BACKUP_DIR"
docker exec "$DB_CONTAINER" sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$BACKUP_DIR/db.sql"
tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$ACTIVE_CMS_SOURCE/public" uploads
tar -czf "$BACKUP_DIR/cms_green_source.tar.gz" -C "$APP_DIR" cms_green
install -m 600 "$COMPOSE_GREEN" "$BACKUP_DIR/docker-compose.green.yml"
install -m 600 "$EXTERNAL_ENV" "$BACKUP_DIR/cms_green.env.backup"
sha256sum "$BACKUP_DIR/db.sql" "$BACKUP_DIR/uploads.tar.gz" "$BACKUP_DIR/cms_green_source.tar.gz" "$BACKUP_DIR/docker-compose.green.yml" "$BACKUP_DIR/cms_green.env.backup" > "$BACKUP_DIR/SHA256SUMS"
tar -tzf "$BACKUP_DIR/uploads.tar.gz" >/dev/null
tar -tzf "$BACKUP_DIR/cms_green_source.tar.gz" >/dev/null
echo "BACKUP_DIR=$BACKUP_DIR"
REMOTE
}

run_apply() {
  local server="$1"
  local commit="$2"
  local bootstrap="$3"
  local tmpdir archive compose_tmp remote_dir backup_output backup_dir
  [ "${SHARMAR_PRODUCTION_DEPLOY_CONFIRM:-}" = YES ] || die "--apply requires SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES"

  remote_readonly_baseline "$server"
  if [ "$bootstrap" = YES ]; then
    remote_bootstrap_external_env "$server"
  fi
  remote_env_gate "$server"
  backup_output="$(remote_backup "$server")"
  printf '%s\n' "$backup_output"
  backup_dir="$(printf '%s\n' "$backup_output" | awk -F= '$1=="BACKUP_DIR" {print $2}' | tail -n 1)"
  [ -n "$backup_dir" ] || die "remote backup did not return BACKUP_DIR"

  tmpdir="$(mktemp -d)"
  archive="$tmpdir/cms.tar"
  compose_tmp="$tmpdir/docker-compose.green.yml"
  make_archive "$commit" "$archive"
  cp docker-compose.green.yml "$compose_tmp"

  remote_dir="/tmp/sharmar_cms_green_deploy_${commit:0:7}_$(date -u +%Y%m%dT%H%M%SZ)"
  "$SSH_BIN" -T -- "$server" "install -d -m 700 '$remote_dir'"
  "$SCP_BIN" -- "$archive" "$server:$remote_dir/cms.tar"
  "$SCP_BIN" -- "$compose_tmp" "$server:$remote_dir/docker-compose.green.yml"
  "$SSH_BIN" -T -- "$server" \
    "BACKUP_DIR='$backup_dir' DEPLOY_COMMIT_SHORT='${commit:0:7}' REMOTE_ARCHIVE='$remote_dir/cms.tar' REMOTE_COMPOSE_TMP='$remote_dir/docker-compose.green.yml' bash -s" \
    <<<"$(remote_apply_script)"
}

main() {
  local server="" commit="" mode="dry-run" bootstrap="NO"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --server) server="${2:-}"; shift 2 ;;
      --commit) commit="${2:-}"; shift 2 ;;
      --dry-run) [ "$mode" != apply ] || die "--apply and --dry-run are mutually exclusive"; mode="dry-run_explicit"; shift ;;
      --apply) [ "$mode" != dry-run_explicit ] || die "--apply and --dry-run are mutually exclusive"; mode="apply"; shift ;;
      --bootstrap-external-env) bootstrap="YES"; shift ;;
      --help|-h) usage; exit 0 ;;
      *) die "unknown argument: $1" ;;
    esac
  done

  for arg in "$@"; do : "$arg"; done
  [ -n "$server" ] || die "--server is required"
  valid_server "$server" || die "--server must be user@host"
  [ -n "$commit" ] || die "--commit is required"
  is_full_sha "$commit" || die "--commit must be a full 40-character lowercase SHA"
  [ "$bootstrap" = NO ] || [ "$mode" = apply ] || die "--bootstrap-external-env requires --apply"

  require_cmd git
  require_cmd tar
  require_cmd "$SSH_BIN"
  require_cmd "$SCP_BIN"
  assert_repo_root
  assert_clean_worktree
  assert_no_tracked_envs
  validate_local_commit "$commit"

  local tmp_archive
  tmp_archive="$(mktemp)"
  make_archive "$commit" "$tmp_archive"

  log PHASE_1_LOCAL_PREFLIGHT
  if [ "$mode" = apply ]; then
    log MODE=APPLY
    run_apply "$server" "$commit" "$bootstrap"
  else
    log MODE=DRY_RUN
    log DRY_RUN=YES
    remote_readonly_baseline "$server"
    log "PLAN=backup,upload_compose,upload_archive,isolated_build,pre_switch_gate,source_switch,recreate_cms_only,post_switch_gate,rollback_on_failure"
    log DRY_RUN_COMPLETE=YES
    log PRODUCTION_FILES_CHANGED=NO
    log CONTAINER_RESTARTED=NO
    log DATABASE_CHANGED=NO
  fi
}

if [ "${SHARMAR_DEPLOY_LIB_ONLY:-NO}" = YES ]; then
  return 0 2>/dev/null || exit 0
fi

main "$@"
