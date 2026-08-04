import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const service = readFileSync(
  new URL(
    "../../cms/src/api/admin-moderation/services/admin-moderation.ts",
    import.meta.url
  ),
  "utf8"
);

test("moderation loads max guests and linked boat capacity", () => {
  assert.ok(service.includes("max_guests: number | null;"));
  assert.ok(service.includes("capacity: number | null;"));
  assert.ok(service.includes("max_guests: asNumber(value.max_guests)"));
  assert.ok(service.includes("capacity: asNumber(value.capacity)"));

  assert.equal(
    (service.match(/"max_guests",/g) ?? []).length,
    2
  );

  assert.equal(
    (service.match(/"capacity",/g) ?? []).length,
    4
  );
});

test("approve and direct publish fail closed on capacity", () => {
  assert.ok(
    service.includes(
      'if (input.action === "approve" || input.action === "publish")'
    )
  );

  assert.ok(service.includes('"route_max_guests_required"'));
  assert.ok(service.includes('"route_boat_capacity_required"'));
  assert.ok(
    service.includes(
      '"route_max_guests_exceeds_boat_capacity"'
    )
  );

  assert.ok(service.includes("code: capacityBlocker"));
});

test("unified publication reports route-specific blocker", () => {
  assert.ok(
    service.includes(
      "const capacityBlocker = experienceGuestCapacityBlocker(rows);"
    )
  );

  assert.ok(
    service.includes(
      "blockers.push(`${capacityBlocker}:${experienceDocumentId}`)"
    )
  );
});

test("capacity validator performs no writes", () => {
  const start = service.indexOf(
    "function experienceGuestCapacityBlocker("
  );

  const end = service.indexOf(
    "async function linkedBoatReadyForExperiencePublish(",
    start
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const helper = service.slice(start, end);

  assert.doesNotMatch(
    helper,
    /\.update\(|\.publish\(|\.unpublish\(|transaction\(/
  );
});
