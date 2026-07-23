import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const projectRoot = dirname(frontendRoot);

const manager = readFileSync(join(frontendRoot, "app/[lang]/admin/AdminCrudManager.tsx"), "utf8");
const stateMachine = readFileSync(join(projectRoot, "cms/src/api/admin-moderation/services/state-machine.ts"), "utf8");
const moderationService = readFileSync(join(projectRoot, "cms/src/api/admin-moderation/services/admin-moderation.ts"), "utf8");

test("owner verification button uses protected moderation endpoint", () => {
  assert.ok(manager.includes('verifyOwner: "Подтвердить владельца"'));
  assert.ok(manager.includes('fetch("/api/admin/moderation"'));
  assert.ok(manager.includes('entityType: "owner_profile"'));
  assert.ok(manager.includes('action: "verify"'));
  assert.ok(manager.includes('currentStatus !== "documents_uploaded"'));
});

test("owner verify transition is direct", () => {
  assert.ok(stateMachine.includes('| "verify"'));
  assert.ok(stateMachine.includes('verify: {\n    documents_uploaded: "approved",\n  },'));
});

test("owner verify changes only status and verified timestamp", () => {
  const start = moderationService.indexOf('if (input.action === "verify") {');
  const end = moderationService.indexOf('} else if (input.action === "approve")', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = moderationService.slice(start, end);
  assert.ok(block.includes('data.verified_at = now'));
  assert.doesNotMatch(block, /rejected_at|rejection_reason|notes|documents_uploaded_at/);
});
