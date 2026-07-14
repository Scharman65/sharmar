import assert from "node:assert/strict";
import test from "node:test";

import {
  planBoatModerationTransition,
  planOwnerModerationTransition,
} from "../../src/api/admin-moderation/services/state-machine";

test("boat moderation allows the intended happy path", () => {
  const steps = [
    ["submitted", "start_review", "", "under_review"],
    ["under_review", "approve", "", "approved"],
    ["approved", "publish", "", "published"],
    ["published", "unpublish", "", "approved"],
    ["approved", "archive", "", "archived"],
  ] as const;

  for (const [currentStatus, action, comment, nextStatus] of steps) {
    const result = planBoatModerationTransition({
      currentStatus,
      action,
      comment,
    });

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.nextStatus, nextStatus);
  }
});

test("boat moderation requires comments for changes and rejection", () => {
  assert.deepEqual(
    planBoatModerationTransition({
      currentStatus: "under_review",
      action: "request_changes",
      comment: "",
    }),
    { ok: false, code: "comment_required" }
  );

  const accepted = planBoatModerationTransition({
    currentStatus: "under_review",
    action: "reject",
    comment: "Missing registration document",
  });

  assert.equal(accepted.ok, true);
  if (accepted.ok) assert.equal(accepted.nextStatus, "rejected");
});

test("boat moderation blocks forbidden transitions", () => {
  assert.deepEqual(
    planBoatModerationTransition({
      currentStatus: "draft",
      action: "approve",
    }),
    { ok: false, code: "transition_not_allowed" }
  );

  assert.deepEqual(
    planBoatModerationTransition({
      currentStatus: "submitted",
      action: "publish",
    }),
    { ok: false, code: "transition_not_allowed" }
  );
});

test("owner verification allows review and approval", () => {
  const start = planOwnerModerationTransition({
    currentStatus: "documents_uploaded",
    action: "start_review",
  });

  assert.equal(start.ok, true);
  if (start.ok) assert.equal(start.nextStatus, "under_review");

  const approve = planOwnerModerationTransition({
    currentStatus: "under_review",
    action: "approve",
  });

  assert.equal(approve.ok, true);
  if (approve.ok) assert.equal(approve.nextStatus, "approved");
});

test("owner verification requires comments for negative actions", () => {
  assert.deepEqual(
    planOwnerModerationTransition({
      currentStatus: "under_review",
      action: "request_changes",
      comment: "",
    }),
    { ok: false, code: "comment_required" }
  );

  const reject = planOwnerModerationTransition({
    currentStatus: "under_review",
    action: "reject",
    comment: "Identity document is unreadable",
  });

  assert.equal(reject.ok, true);
  if (reject.ok) assert.equal(reject.nextStatus, "rejected");
});
