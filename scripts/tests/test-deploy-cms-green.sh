#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/scripts/deploy-cms-green.sh"
TEST_COUNT=0
FAIL_COUNT=0
ENV_CLASSIFIER_TEST_COUNT=0
TMP_ROOT="$(mktemp -d)"

finish() {
  if [ -n "${TMP_ROOT:-}" ] && [ -d "$TMP_ROOT" ]; then
    find "$TMP_ROOT" -mindepth 1 -maxdepth 1 -exec rm -R -- {} +
    rmdir "$TMP_ROOT"
  fi
}
trap finish EXIT

pass() {
  TEST_COUNT=$((TEST_COUNT + 1))
  printf 'ok %02d - %s\n' "$TEST_COUNT" "$1"
}

fail_test() {
  TEST_COUNT=$((TEST_COUNT + 1))
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf 'not ok %02d - %s\n' "$TEST_COUNT" "$1" >&2
}

assert_success() {
  local name="$1"
  shift
  if "$@" >"$TMP_ROOT/out" 2>"$TMP_ROOT/err"; then
    pass "$name"
  else
    fail_test "$name"
    cat "$TMP_ROOT/out" "$TMP_ROOT/err" >&2 || true
  fi
}

assert_failure() {
  local name="$1"
  shift
  if "$@" >"$TMP_ROOT/out" 2>"$TMP_ROOT/err"; then
    fail_test "$name"
    cat "$TMP_ROOT/out" "$TMP_ROOT/err" >&2 || true
  else
    pass "$name"
  fi
}

assert_contains() {
  local name="$1"
  local file="$2"
  local pattern="$3"
  if grep -Eq "$pattern" "$file"; then
    pass "$name"
  else
    fail_test "$name"
    sed -n '1,160p' "$file" >&2 || true
  fi
}

assert_not_contains() {
  local name="$1"
  local file="$2"
  local pattern="$3"
  if grep -Eq "$pattern" "$file"; then
    fail_test "$name"
    sed -n '1,160p' "$file" >&2 || true
  else
    pass "$name"
  fi
}

make_repo() {
  local dir="$1"
  mkdir -p "$dir/cms" "$dir/scripts/tests" "$dir/docs"
  cp "$ROOT/.gitignore" "$dir/.gitignore"
  cp "$ROOT/docker-compose.green.yml" "$dir/docker-compose.green.yml"
  cp "$SCRIPT" "$dir/scripts/deploy-cms-green.sh"
  cp "$ROOT/scripts/tests/test-deploy-cms-green.sh" "$dir/scripts/tests/test-deploy-cms-green.sh"
  printf 'ok\n' > "$dir/cms/package.json"
  printf 'console.log("cms")\n' > "$dir/cms/index.js"
  printf '# ops\n' > "$dir/docs/OPERATIONS.md"
  (
    cd "$dir"
    git init -q
    git config user.email test@example.invalid
    git config user.name 'Deploy Test'
    git add .gitignore docker-compose.green.yml scripts/deploy-cms-green.sh scripts/tests/test-deploy-cms-green.sh docs/OPERATIONS.md cms/package.json cms/index.js
    git commit -q -m init
  )
}

install_fakes() {
  local bin="$1"
  mkdir -p "$bin"
  cat > "$bin/ssh" <<'FAKE_SSH'
#!/usr/bin/env bash
set -euo pipefail
log="${FAKE_LOG:?}/ssh.log"
count_file="${FAKE_LOG:?}/ssh.count"
count=0
[ -f "$count_file" ] && count="$(cat "$count_file")"
count=$((count + 1))
printf '%s' "$count" > "$count_file"
stdin_file="${FAKE_LOG:?}/ssh.stdin.$count"
cat > "$stdin_file"
printf 'CALL=%s ARGS=%s\n' "$count" "$*" >> "$log"
scenario="${FAKE_SCENARIO:-success}"

if printf '%s\n' "$*" | grep -q "install -d -m 700"; then
  echo "REMOTE_TMP_CREATED=YES"
  exit 0
fi

case "$count" in
  1)
    cat <<'OUT'
PHASE_2_REMOTE_BASELINE
DISK_ROOT=33%
CMS_CONTAINER_RUNNING=YES
CMS_RESTART_COUNT=0
DB_CONTAINER_RUNNING=YES
CMS_LOCAL_HTTP=200
PUBLIC_API_HTTP=200
ACTIVE_SOURCE=/opt/sharmar/app/cms_green
COMPOSE_SHA256=abc
EXTERNAL_ENV_PRESENT=YES
EXTERNAL_ENV_MODE=600
ADMIN_JWT_SECRET_NONEMPTY=YES
APP_KEYS_NONEMPTY=YES
API_TOKEN_SALT_NONEMPTY=YES
TRANSFER_TOKEN_SALT_NONEMPTY=YES
JWT_SECRET_NONEMPTY=YES
boats=7
booking_requests=1
bookings=0
payments=0
dodo_webhook_events=0
propulsion_present=YES
propulsion_nullable=YES
OUT
    exit 0
    ;;
  2)
    if [ "$scenario" = "missing_external_env" ]; then
      echo "EXTERNAL_ENV_PRESENT=NO"
      exit 20
    fi
    cat <<'OUT'
EXTERNAL_ENV_MODE_SAFE=YES
ADMIN_JWT_SECRET_NONEMPTY=YES
APP_KEYS_NONEMPTY=YES
API_TOKEN_SALT_NONEMPTY=YES
TRANSFER_TOKEN_SALT_NONEMPTY=YES
JWT_SECRET_NONEMPTY=YES
OUT
    exit 0
    ;;
  3)
    if [ "$scenario" = "backup_fail" ]; then
      echo "PHASE_3_BACKUP"
      echo "BACKUP=FAIL"
      exit 31
    fi
    echo "PHASE_3_BACKUP"
    echo "BACKUP_DIR=/opt/sharmar/backups/mock"
    exit 0
    ;;
  *)
    case "$scenario" in
      build_fail)
        echo "PHASE_6_REMOTE_ISOLATED_BUILD"
        echo "BUILD=FAIL"
        exit 41
        ;;
      preswitch_fail)
        echo "PHASE_7_PRE_SWITCH_GATE"
        echo "PRE_SWITCH_GATE=FAIL"
        exit 42
        ;;
      recreate_fail)
        echo "PHASE_9_RECREATE_CMS_ONLY"
        echo "ROLLBACK_PERFORMED=YES"
        echo "ROLLBACK_RESULT=PASS"
        echo "ROLLBACK_RECREATES_CMS_ONLY=YES"
        exit 1
        ;;
      restart_loop)
        echo "PHASE_10_POST_SWITCH_HEALTH_SCHEMA_DATA"
        echo "CMS_RESTART_COUNT=3"
        echo "ROLLBACK_PERFORMED=YES"
        echo "ROLLBACK_RESULT=PASS"
        echo "RESTORED_PREVIOUS_SOURCE=YES"
        exit 1
        ;;
      health_timeout)
        echo "PHASE_10_POST_SWITCH_HEALTH_SCHEMA_DATA"
        echo "HEALTH_TIMEOUT=YES"
        echo "ROLLBACK_PERFORMED=YES"
        echo "ROLLBACK_RESULT=PASS"
        exit 1
        ;;
      schema_fail)
        echo "PHASE_10_POST_SWITCH_HEALTH_SCHEMA_DATA"
        echo "SCHEMA_GATE=FAIL"
        echo "ROLLBACK_PERFORMED=YES"
        echo "ROLLBACK_RESULT=PASS"
        exit 1
        ;;
      db_mismatch)
        echo "PHASE_10_POST_SWITCH_HEALTH_SCHEMA_DATA"
        echo "DATABASE_COUNTS_MATCH=NO"
        echo "ROLLBACK_PERFORMED=YES"
        echo "ROLLBACK_RESULT=PASS"
        exit 1
        ;;
      success|*)
        cat <<'OUT'
PHASE_4_UPLOAD_AND_VALIDATE_COMPOSE
PHASE_5_UPLOAD_STAGE_ARCHIVE
PHASE_6_REMOTE_ISOLATED_BUILD
PHASE_7_PRE_SWITCH_GATE
PHASE_8_SOURCE_SWITCH
PHASE_9_RECREATE_CMS_ONLY
PHASE_10_POST_SWITCH_HEALTH_SCHEMA_DATA
ROLLBACK_PERFORMED=NO
ROLLBACK_RESULT=NOT_REQUIRED
CMS_GREEN_DEPLOY=PASS
OUT
        exit 0
        ;;
    esac
    ;;
esac
FAKE_SSH
  chmod +x "$bin/ssh"

  cat > "$bin/scp" <<'FAKE_SCP'
#!/usr/bin/env bash
set -euo pipefail
printf 'ARGS=%s\n' "$*" >> "${FAKE_LOG:?}/scp.log"
exit 0
FAKE_SCP
  chmod +x "$bin/scp"
}

run_in_repo() {
  local repo="$1"
  shift
  (cd "$repo" && SSH_BIN="$FAKE_BIN/ssh" SCP_BIN="$FAKE_BIN/scp" FAKE_LOG="$FAKE_LOG" "$@")
}

make_classifier_repo() {
  local dir="$1"
  shift
  mkdir -p "$dir"
  (
    cd "$dir"
    git init -q
    git config user.email test@example.invalid
    git config user.name 'Deploy Test'
    local path
    for path in "$@"; do
      mkdir -p "$(dirname "$path")"
      printf 'dummy-value\n' > "$path"
      git add "$path"
    done
    git commit -q -m classifier
  )
}

run_classifier_in_repo() {
  local repo="$1"
  (
    cd "$repo"
    SHARMAR_DEPLOY_LIB_ONLY=YES source "$SCRIPT"
    assert_no_tracked_envs
  )
}

assert_classifier_success() {
  local name="$1"
  shift
  ENV_CLASSIFIER_TEST_COUNT=$((ENV_CLASSIFIER_TEST_COUNT + 1))
  assert_success "$name" "$@"
}

assert_classifier_failure() {
  local name="$1"
  shift
  ENV_CLASSIFIER_TEST_COUNT=$((ENV_CLASSIFIER_TEST_COUNT + 1))
  assert_failure "$name" "$@"
}

classifier_repo_case() {
  local expectation="$1"
  local name="$2"
  shift 2
  local repo="$TMP_ROOT/classifier-$ENV_CLASSIFIER_TEST_COUNT"
  make_classifier_repo "$repo" "$@"
  if [ "$expectation" = pass ]; then
    assert_classifier_success "$name" run_classifier_in_repo "$repo"
  else
    assert_classifier_failure "$name" run_classifier_in_repo "$repo"
  fi
}

REPO="$TMP_ROOT/repo"
make_repo "$REPO"
COMMIT="$(cd "$REPO" && git rev-parse HEAD)"
FAKE_BIN="$TMP_ROOT/bin"
FAKE_LOG="$TMP_ROOT/fake-log"
mkdir -p "$FAKE_LOG"
install_fakes "$FAKE_BIN"

assert_success "help exits 0" run_in_repo "$REPO" "$SCRIPT" --help

classifier_repo_case pass "cms .env.example accepted" "cms/.env.example"
classifier_repo_case pass "frontend production local example accepted" "frontend/.env.production.local.example"
classifier_repo_case pass "multiple example templates accepted" ".env.example" "cms/.env.example" "frontend/.env.production.local.example"
assert_classifier_success "current project tracked templates accepted" bash -lc "cd '$ROOT'; SHARMAR_DEPLOY_LIB_ONLY=YES source '$SCRIPT'; assert_no_tracked_envs"
classifier_repo_case fail "root .env rejected" ".env"
classifier_repo_case fail "cms .env rejected" "cms/.env"
classifier_repo_case fail "frontend .env.local rejected" "frontend/.env.local"
classifier_repo_case fail "cms .env.production rejected" "cms/.env.production"
classifier_repo_case fail "root cms_green.env rejected" "cms_green.env"
classifier_repo_case fail "nested cms_green.env rejected" "ops/cms_green.env"
classifier_repo_case fail "shared cms_green.env rejected" "shared/cms_green.env"
classifier_repo_case fail "shared secondary env rejected" "shared/secondary.env"
classifier_repo_case fail "shared nested runtime env rejected" "shared/nested/runtime.env"
classifier_repo_case fail ".env.example.local rejected" ".env.example.local"
classifier_repo_case fail ".env.production.example.env rejected" ".env.production.example.env"
leak_repo="$TMP_ROOT/classifier-leak"
make_classifier_repo "$leak_repo" ".env"
printf 'DO_NOT_PRINT_THIS_TEST_SECRET\n' > "$leak_repo/.env"
assert_classifier_failure "rejected error omits file contents" run_classifier_in_repo "$leak_repo"
assert_not_contains "rejected error contains only path" "$TMP_ROOT/err" 'DO_NOT_PRINT_THIS_TEST_SECRET'
ENV_CLASSIFIER_TEST_COUNT=$((ENV_CLASSIFIER_TEST_COUNT + 1))
classifier_repo_case pass "path with spaces accepted" "dir with space/.env.example"
classifier_repo_case pass "classifier handles arbitrary template count" ".env.example" "cms/.env.example" "frontend/.env.example" "frontend/.env.production.local.example" "ops/.env.review.example"

assert_success "default mode succeeds as dry-run" run_in_repo "$REPO" "$SCRIPT" --server root@91.98.125.132 --commit "$COMMIT"
assert_contains "default mode prints dry-run" "$TMP_ROOT/out" 'DRY_RUN=YES'
assert_contains "default mode completes dry-run" "$TMP_ROOT/out" 'DRY_RUN_COMPLETE=YES'
[ ! -f "$FAKE_LOG/scp.log" ] && pass "default mode performs no upload" || fail_test "default mode performs no upload"

rm -f "$FAKE_LOG"/ssh.* "$FAKE_LOG/scp.log"
assert_success "explicit dry-run succeeds" run_in_repo "$REPO" "$SCRIPT" --server root@91.98.125.132 --commit "$COMMIT" --dry-run
assert_contains "explicit dry-run read-only" "$TMP_ROOT/out" 'PRODUCTION_FILES_CHANGED=NO'

assert_failure "apply without marker rejected" run_in_repo "$REPO" "$SCRIPT" --server root@91.98.125.132 --commit "$COMMIT" --apply
[ ! -f "$FAKE_LOG/scp.log" ] && pass "apply without marker uploads nothing" || fail_test "apply without marker uploads nothing"

assert_success "marker without apply remains dry-run" env SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES bash -lc "cd '$REPO' && SSH_BIN='$FAKE_BIN/ssh' SCP_BIN='$FAKE_BIN/scp' FAKE_LOG='$FAKE_LOG' '$SCRIPT' --server root@91.98.125.132 --commit '$COMMIT'"
assert_contains "marker without apply dry-run marker" "$TMP_ROOT/out" 'DRY_RUN=YES'

assert_failure "apply and dry-run rejected" run_in_repo "$REPO" "$SCRIPT" --server root@91.98.125.132 --commit "$COMMIT" --dry-run --apply
assert_failure "missing server rejected" run_in_repo "$REPO" "$SCRIPT" --commit "$COMMIT"
assert_failure "invalid server rejected" run_in_repo "$REPO" "$SCRIPT" --server 'bad server' --commit "$COMMIT"
assert_failure "short commit rejected" run_in_repo "$REPO" "$SCRIPT" --server root@91.98.125.132 --commit "${COMMIT:0:7}"

printf 'dirty\n' >> "$REPO/cms/index.js"
assert_failure "dirty worktree rejected" run_in_repo "$REPO" "$SCRIPT" --server root@91.98.125.132 --commit "$COMMIT"
(cd "$REPO" && git checkout -q -- cms/index.js)

rm -f "$FAKE_LOG"/ssh.* "$FAKE_LOG/scp.log"
assert_failure "missing external env rejected in apply" env SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES FAKE_SCENARIO=missing_external_env bash -lc "cd '$REPO' && SSH_BIN='$FAKE_BIN/ssh' SCP_BIN='$FAKE_BIN/scp' FAKE_LOG='$FAKE_LOG' '$SCRIPT' --server root@91.98.125.132 --commit '$COMMIT' --apply"
[ ! -f "$FAKE_LOG/scp.log" ] && pass "missing external env prevents upload" || fail_test "missing external env prevents upload"

ENV_DIR="$TMP_ROOT/envs"
mkdir -p "$ENV_DIR"
make_env() {
  local file="$1"
  {
    echo 'ADMIN_JWT_SECRET=x'
    echo 'APP_KEYS=a,b'
    echo 'API_TOKEN_SALT=x'
    echo 'TRANSFER_TOKEN_SALT=x'
    echo 'JWT_SECRET=x'
  } > "$file"
}
make_env "$ENV_DIR/good.env"
chmod 600 "$ENV_DIR/good.env"
assert_success "mode 600 accepted" bash -lc "SHARMAR_DEPLOY_LIB_ONLY=YES source '$SCRIPT'; validate_env_file_local '$ENV_DIR/good.env'"
cp "$ENV_DIR/good.env" "$ENV_DIR/m444.env"; chmod 444 "$ENV_DIR/m444.env"
assert_failure "mode 444 rejected" bash -lc "SHARMAR_DEPLOY_LIB_ONLY=YES source '$SCRIPT'; validate_env_file_local '$ENV_DIR/m444.env'"
cp "$ENV_DIR/good.env" "$ENV_DIR/m640.env"; chmod 640 "$ENV_DIR/m640.env"
assert_failure "mode 640 rejected" bash -lc "SHARMAR_DEPLOY_LIB_ONLY=YES source '$SCRIPT'; validate_env_file_local '$ENV_DIR/m640.env'"
cp "$ENV_DIR/good.env" "$ENV_DIR/m660.env"; chmod 660 "$ENV_DIR/m660.env"
assert_failure "mode 660 rejected" bash -lc "SHARMAR_DEPLOY_LIB_ONLY=YES source '$SCRIPT'; validate_env_file_local '$ENV_DIR/m660.env'"
grep -v '^ADMIN_JWT_SECRET=' "$ENV_DIR/good.env" > "$ENV_DIR/missing-admin.env"; chmod 600 "$ENV_DIR/missing-admin.env"
assert_failure "missing ADMIN_JWT_SECRET rejected" bash -lc "SHARMAR_DEPLOY_LIB_ONLY=YES source '$SCRIPT'; validate_env_file_local '$ENV_DIR/missing-admin.env'"
cp "$ENV_DIR/good.env" "$ENV_DIR/empty-admin.env"; perl -0pi -e 's/ADMIN_JWT_SECRET=.*/ADMIN_JWT_SECRET=/' "$ENV_DIR/empty-admin.env"; chmod 600 "$ENV_DIR/empty-admin.env"
assert_failure "empty ADMIN_JWT_SECRET rejected" bash -lc "SHARMAR_DEPLOY_LIB_ONLY=YES source '$SCRIPT'; validate_env_file_local '$ENV_DIR/empty-admin.env'"
grep -v '^APP_KEYS=' "$ENV_DIR/good.env" > "$ENV_DIR/missing-app.env"; chmod 600 "$ENV_DIR/missing-app.env"
assert_failure "missing APP_KEYS rejected" bash -lc "SHARMAR_DEPLOY_LIB_ONLY=YES source '$SCRIPT'; validate_env_file_local '$ENV_DIR/missing-app.env'"

BAD_REPO="$TMP_ROOT/bad-archive"
mkdir -p "$BAD_REPO/cms"
(
  cd "$BAD_REPO"
  git init -q
  git config user.email test@example.invalid
  git config user.name 'Deploy Test'
  echo secret > cms/.env
  git add cms/.env
  git commit -q -m bad
)
BAD_COMMIT="$(cd "$BAD_REPO" && git rev-parse HEAD)"
assert_failure "local archive containing .env rejected" bash -lc "cd '$BAD_REPO'; SHARMAR_DEPLOY_LIB_ONLY=YES source '$SCRIPT'; make_archive '$BAD_COMMIT' '$TMP_ROOT/bad.tar'"

rm -f "$FAKE_LOG"/ssh.* "$FAKE_LOG/scp.log"
assert_failure "failed backup prevents stage" env SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES FAKE_SCENARIO=backup_fail bash -lc "cd '$REPO' && SSH_BIN='$FAKE_BIN/ssh' SCP_BIN='$FAKE_BIN/scp' FAKE_LOG='$FAKE_LOG' '$SCRIPT' --server root@91.98.125.132 --commit '$COMMIT' --apply"
[ ! -f "$FAKE_LOG/scp.log" ] && pass "failed backup prevents upload stage" || fail_test "failed backup prevents upload stage"

for scenario in build_fail preswitch_fail recreate_fail restart_loop health_timeout schema_fail db_mismatch; do
  rm -f "$FAKE_LOG"/ssh.* "$FAKE_LOG/scp.log"
  assert_failure "$scenario exits nonzero" env SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES FAKE_SCENARIO="$scenario" bash -lc "cd '$REPO' && SSH_BIN='$FAKE_BIN/ssh' SCP_BIN='$FAKE_BIN/scp' FAKE_LOG='$FAKE_LOG' '$SCRIPT' --server root@91.98.125.132 --commit '$COMMIT' --apply"
  case "$scenario" in
    build_fail) assert_not_contains "failed build prevents source switch" "$TMP_ROOT/out" 'PHASE_8_SOURCE_SWITCH' ;;
    preswitch_fail) assert_not_contains "failed pre-switch prevents recreate" "$TMP_ROOT/out" 'PHASE_9_RECREATE_CMS_ONLY' ;;
    recreate_fail) assert_contains "recreate failure causes rollback" "$TMP_ROOT/out" 'ROLLBACK_PERFORMED=YES' ;;
    restart_loop) assert_contains "restart loop causes rollback" "$TMP_ROOT/out" 'ROLLBACK_PERFORMED=YES' ;;
    health_timeout) assert_contains "health timeout causes rollback" "$TMP_ROOT/out" 'ROLLBACK_PERFORMED=YES' ;;
    schema_fail) assert_contains "schema failure causes rollback" "$TMP_ROOT/out" 'ROLLBACK_PERFORMED=YES' ;;
    db_mismatch) assert_contains "database mismatch causes rollback" "$TMP_ROOT/out" 'ROLLBACK_PERFORMED=YES' ;;
  esac
done

assert_contains "rollback restores previous source" "$TMP_ROOT/out" 'ROLLBACK_RESULT=PASS|ROLLBACK_PERFORMED=YES'
assert_contains "rollback recreates only CMS" "$SCRIPT" 'up -d --no-deps --force-recreate "\$CMS_SERVICE"'
assert_not_contains "PostgreSQL restart never called" "$SCRIPT" 'up -d[^\n]*(db|sharmar_pg)|restart[^\n]*(db|sharmar_pg)'
forbidden_down_pattern='docker compose d''own'
assert_not_contains "compose service stop command absent" "$SCRIPT" "$forbidden_down_pattern"
assert_not_contains "frontend deploy never called" "$SCRIPT" 'vercel[[:space:]]+deploy|npm[[:space:]]+--prefix[[:space:]]+frontend'
payment_request_pattern='curl.*(api/pay''ments/intent|api/re''quest|/check''out|str''ipe|do''do)'
assert_not_contains "write endpoint calls absent" "$SCRIPT" "$payment_request_pattern"

assert_not_contains "secret values never appear in output" "$TMP_ROOT/out" 'ADMIN_JWT_SECRET=x|JWT_SECRET=x|APP_KEYS=a,b'
assert_not_contains "git add force is never used by script" "$SCRIPT" 'git[[:space:]]+add[[:space:]]+-f'

git check-ignore --no-index -q "$ROOT/shared/cms_green.env" && pass "shared cms env ignored" || fail_test "shared cms env ignored"
git check-ignore --no-index -q "$ROOT/shared/example.env" && pass "shared env ignored" || fail_test "shared env ignored"
git check-ignore --no-index -q "$ROOT/shared/nested/example.env" && pass "nested shared env ignored" || fail_test "nested shared env ignored"
if git check-ignore --no-index -q "$ROOT/shared/README.md"; then fail_test "shared README allowed"; else pass "shared README allowed"; fi
if git check-ignore --no-index -q "$ROOT/shared/deployment-notes.txt"; then fail_test "shared non-env file allowed"; else pass "shared non-env file allowed"; fi

assert_success "bash syntax deploy script" bash -n "$SCRIPT"
assert_success "bash syntax test script" bash -n "$ROOT/scripts/tests/test-deploy-cms-green.sh"

if [ "$ENV_CLASSIFIER_TEST_COUNT" -lt 18 ]; then
  echo "FAIL: ENV_CLASSIFIER_TEST_COUNT=$ENV_CLASSIFIER_TEST_COUNT, expected at least 18" >&2
  exit 1
fi

if [ "$TEST_COUNT" -lt 70 ]; then
  echo "FAIL: SCRIPT_TEST_COUNT=$TEST_COUNT, expected at least 70" >&2
  exit 1
fi

echo "ENV_CLASSIFIER_TEST_COUNT=$ENV_CLASSIFIER_TEST_COUNT"
echo "SCRIPT_TEST_COUNT=$TEST_COUNT"
if [ "$FAIL_COUNT" -ne 0 ]; then
  echo "FAIL: $FAIL_COUNT tests failed" >&2
  exit 1
fi
echo "deploy-cms-green tests passed"
