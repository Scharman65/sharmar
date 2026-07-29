import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repositoryRoot = path.resolve(__dirname, "../../../../..");
const migrationPath = path.join(
  repositoryRoot,
  "cms/database/migrations/20260729124500-align-hold-with-logical-availability.js"
);
const migration = fs.readFileSync(migrationPath, "utf8");

test("hold validation resolves the whole logical boat", () => {
  assert.match(migration, /b\.document_id\s*=\s*v_document_id/);
  assert.match(migration, /JOIN public\.boats b ON b\.id = bk\.boat_id/);
  assert.match(migration, /JOIN public\.boats b ON b\.id = x\.boat_id/);
});

test("hold validation is open by default without custom rules", () => {
  assert.match(migration, /v_has_custom_rules/);
  assert.match(migration, /IF v_has_custom_rules\s+AND NOT EXISTS/s);
  assert.doesNotMatch(
    migration,
    /IF NOT EXISTS \(\s+SELECT 1\s+FROM public\.boat_availability_rules/s
  );
});

test("custom availability rules remain authoritative when present", () => {
  assert.match(migration, /r\.active = true/);
  assert.match(migration, /r\.weekday = v_weekday/);
  assert.match(migration, /v_local_start::time >= r\.start_time_local/);
  assert.match(migration, /v_local_end::time <= r\.end_time_local/);
});

test("active bookings block every physical localization row", () => {
  for (const status of ["hold", "deposit_paid", "paid_pending_owner", "confirmed"]) {
    assert.match(migration, new RegExp(`'${status}'`));
  }
  assert.match(migration, /p_slot_start_utc < bk\.slot_end_utc/);
  assert.match(migration, /p_slot_end_utc > bk\.slot_start_utc/);
});

test("timezone-aware overload delegates to the corrected function", () => {
  assert.match(migration, /p_slot_start_utc AT TIME ZONE 'UTC'/);
  assert.match(migration, /p_slot_end_utc AT TIME ZONE 'UTC'/);
});
