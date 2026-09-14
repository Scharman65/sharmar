#!/usr/bin/env bash
# Prepare a disconnected database from the verified September 11 archive.
# This script never switches a CMS connection or replaces an existing database.
set +x
set -euo pipefail
umask 077

SOURCE=/opt/sharmar/backups/data_20260911T092510Z.teXeGPV2
REPO=/opt/sharmar/staging_v2/repo
PG=sharmar_pg_staging
CMS=sharmar_strapi_staging
PROJECT=sharmar_staging_v2
JOB=
CANDIDATE=
CREATED=0

fail() { echo "ERROR=$1" >&2; exit 1; }
lock_candidate() {
  docker exec -i "$PG" psql -X -w -U "$DB_USER" -d postgres \
    -v ON_ERROR_STOP=1 -v candidate="$CANDIDATE" <<'SQL'
ALTER DATABASE :"candidate" ALLOW_CONNECTIONS false;
SQL
}
finish() {
  code=$?
  trap - EXIT
  if [ "$code" -ne 0 ]; then
    set +e
    if [ "$CREATED" = 1 ]; then
      if lock_candidate >> "$JOB/restore.log" 2>&1; then
        echo "CANDIDATE_CONNECTIONS=DISABLED"
      else
        echo "CANDIDATE_LOCK=FAILED"
      fi
    fi
    echo "PREPARATION=FAILED"
    [ -z "$JOB" ] || echo "REPORT_DIR=$JOB"
  fi
  exit "$code"
}
trap finish EXIT

[ "$(id -u)" = 0 ] || fail ROOT_REQUIRED
for container in "$PG" "$CMS"; do
  [ "$(docker inspect "$container" --format '{{index .Config.Labels "com.docker.compose.project"}}')" = "$PROJECT" ] || fail WRONG_PROJECT
  [ "$(docker inspect "$container" --format '{{.State.Running}}')" = true ] || fail CONTAINER_NOT_RUNNING
done
VOLUME="$(docker inspect "$PG" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')"
[ "$VOLUME" = sharmar_staging_v2_sharmar_pg_staging_data ] || fail WRONG_DATABASE_VOLUME
DB_USER="$(docker exec "$PG" printenv POSTGRES_USER)"
[ -n "$DB_USER" ] || fail DATABASE_USER_MISSING

docker exec -i "$CMS" node <<'JS'
const e = process.env;
let safe = e.DATABASE_CLIENT === "postgres" &&
  e.DATABASE_HOST === "db_staging" && e.DATABASE_NAME === "sharmar_staging";
if (e.DATABASE_URL) {
  try {
    const u = new URL(e.DATABASE_URL);
    safe = safe && u.hostname === "db_staging" && u.pathname === "/sharmar_staging";
  } catch { safe = false; }
}
if (!safe) { console.error("ERROR=UNEXPECTED_CMS_DATABASE"); process.exit(1); }
console.log("ACTIVE_DATABASE=sharmar_staging");
for (const name of ["OWNER_API_TOKEN", "STRAPI_WRITE_TOKEN", "RESEND_API_KEY", "DODO_API_KEY"]) {
  console.log(name + "=" + (String(e[name] || "").trim() ? "PRESENT" : "MISSING"));
}
JS

[ -f "$SOURCE/COMPLETE" ] || fail SOURCE_INCOMPLETE
[ -s "$SOURCE/production_sharmar.dump" ] || fail SOURCE_DUMP_MISSING
[ -s "$SOURCE/production_uploads.tar.gz" ] || fail SOURCE_UPLOADS_MISSING
(cd "$SOURCE" && sha256sum --check --status SHA256SUMS) || fail SOURCE_CHECKSUM_MISMATCH
[ -f "$REPO/.env.staging" ] && [ ! -L "$REPO/.env.staging" ] || fail STAGING_ENV_INVALID
AVAILABLE="$(df -Pk /opt/sharmar | awk 'NR==2 {print $4}')"
[ "$AVAILABLE" -ge 1048576 ] || fail FREE_SPACE_BELOW_1GB

mkdir -p /opt/sharmar/staging_v2_prep
JOB="$(mktemp -d /opt/sharmar/staging_v2_prep/data_restore.XXXXXXXX)"
echo "REPORT_DIR=$JOB"
touch "$JOB/INCOMPLETE"
cp -p "$REPO/.env.staging" "$JOB/env.staging.before"
chmod 600 "$JOB/env.staging.before"
cp "$SOURCE/production_sharmar.dump" "$JOB/source.dump"
cp "$SOURCE/production_uploads.tar.gz" "$JOB/source_uploads.tar.gz"
docker exec -i "$PG" pg_restore --list < "$JOB/source.dump" > "$JOB/source.list"

docker exec "$PG" pg_dump -w -U "$DB_USER" -d sharmar_staging \
  --format=custom --no-owner --no-privileges > "$JOB/staging.before.dump"
docker exec -i "$PG" pg_restore --list < "$JOB/staging.before.dump" > "$JOB/staging.before.list"
docker exec "$CMS" tar -C /app/public/uploads -cf - . | gzip -1 > "$JOB/staging_uploads.before.tar.gz"
gzip -t "$JOB/staging_uploads.before.tar.gz"
(
  cd "$JOB"
  sha256sum source.dump source_uploads.tar.gz staging.before.dump \
    staging_uploads.before.tar.gz env.staging.before > SHA256SUMS
  sha256sum --check --status SHA256SUMS
)
touch "$JOB/BACKUP_COMPLETE"
echo "CURRENT_STAGING_BACKUP=CREATED"

CANDIDATE="sharmar_restore_$(date -u +%Y%m%dT%H%M%SZ)_$$"
[[ "$CANDIDATE" =~ ^sharmar_restore_[0-9]{8}T[0-9]{6}Z_[0-9]+$ ]] || fail INVALID_CANDIDATE_NAME
printf '%s\n' "$CANDIDATE" > "$JOB/candidate_database.txt"
docker exec "$PG" createdb -w -U "$DB_USER" --template=template0 "$CANDIDATE"
CREATED=1
echo "RESTORING_DATABASE=$CANDIDATE"
docker exec -i "$PG" pg_restore -w -U "$DB_USER" --dbname="$CANDIDATE" \
  --no-owner --no-privileges --single-transaction --exit-on-error \
  < "$JOB/source.dump" > "$JOB/restore.log" 2>&1

docker exec -i "$PG" psql -X -w -U "$DB_USER" -d "$CANDIDATE" \
  -v ON_ERROR_STOP=1 -At > "$JOB/counts.json" <<'SQL'
SELECT json_build_object(
  'admin_users', (SELECT count(*) FROM public.admin_users),
  'boats', (SELECT count(*) FROM public.boats),
  'experiences', (SELECT count(*) FROM public.experiences),
  'owner_profiles', (SELECT count(*) FROM public.owner_profiles),
  'booking_requests', (SELECT count(*) FROM public.booking_requests),
  'files', (SELECT count(*) FROM public.files),
  'unvalidated_foreign_keys', (SELECT count(*) FROM pg_constraint WHERE contype='f' AND NOT convalidated)
);
SQL
python3 - "$JOB/counts.json" <<'PY'
import json, sys
with open(sys.argv[1]) as source:
    actual = json.load(source)
expected = dict(admin_users=2, boats=15, experiences=28, owner_profiles=3,
                booking_requests=2, files=29, unvalidated_foreign_keys=0)
for name, value in actual.items():
    print("RESTORED_" + name.upper() + "=" + str(value))
if actual != expected:
    raise SystemExit("ERROR=RESTORED_COUNTS_DIFFER_FROM_VERIFIED_ARCHIVE")
PY
docker exec -i "$PG" psql -X -w -U "$DB_USER" -d "$CANDIDATE" \
  -v ON_ERROR_STOP=1 -At > "$JOB/locales.txt" <<'SQL'
SELECT 'boats|' || COALESCE(locale, 'NULL') || '|' || count(*) FROM public.boats GROUP BY locale ORDER BY locale;
SELECT 'experiences|' || COALESCE(locale, 'NULL') || '|' || count(*) FROM public.experiences GROUP BY locale ORDER BY locale;
SQL
cat "$JOB/locales.txt"
lock_candidate >> "$JOB/restore.log" 2>&1
docker exec -i "$PG" psql -X -w -U "$DB_USER" -d postgres \
  -v ON_ERROR_STOP=1 -v candidate="$CANDIDATE" -At > "$JOB/connections.txt" <<'SQL'
SELECT datallowconn FROM pg_database WHERE datname = :'candidate';
SQL
[ "$(cat "$JOB/connections.txt")" = f ] || fail CANDIDATE_NOT_LOCKED
mv "$JOB/INCOMPLETE" "$JOB/COMPLETE"
echo "RESTORE_PREPARATION=PASS"
echo "CANDIDATE_DATABASE=$CANDIDATE"
echo "CANDIDATE_CONNECTIONS=DISABLED"
echo "ACTIVE_STAGING_DATABASE=UNCHANGED"
echo "REPORT_DIR=$JOB"
