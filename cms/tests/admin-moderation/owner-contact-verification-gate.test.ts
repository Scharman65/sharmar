import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const service = readFileSync(
  join(root, "src/api/admin-moderation/services/admin-moderation.ts"),
  "utf8"
);

test("owner moderation requires verified email and WhatsApp before review or approval", () => {
  assert.ok(service.includes('"email_verified"'));
  assert.ok(service.includes('"whatsapp_verified"'));
  assert.ok(service.includes('code: "owner_email_not_verified"'));
  assert.ok(service.includes('code: "owner_whatsapp_not_verified"'));

  const contactGate = service.indexOf('code: "owner_email_not_verified"');
  const documentGate = service.indexOf('code: "owner_document_required"', contactGate);
  assert.ok(contactGate > 0);
  assert.ok(documentGate > contactGate);
});
