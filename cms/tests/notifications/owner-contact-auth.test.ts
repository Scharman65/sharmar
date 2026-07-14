import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ownerContactInternalAuthorized,
  timingSafeEqualString,
} from "../../src/api/boat/controllers/owner-contact-auth.ts";

test("owner contact internal auth accepts only the configured secret", () => {
  assert.equal(
    ownerContactInternalAuthorized({ "x-sharmar-internal-secret": "test_secret" }, "test_secret"),
    true
  );
  assert.equal(
    ownerContactInternalAuthorized({ "x-sharmar-internal-secret": "wrong" }, "test_secret"),
    false
  );
  assert.equal(ownerContactInternalAuthorized({}, "test_secret"), false);
  assert.equal(ownerContactInternalAuthorized({ "x-sharmar-internal-secret": "test_secret" }, ""), false);
});

test("owner contact comparison is exact and length-safe", () => {
  assert.equal(timingSafeEqualString("abc", "abc"), true);
  assert.equal(timingSafeEqualString("abc", "abcd"), false);
  assert.equal(timingSafeEqualString("abc", "abd"), false);
});

test("owner contact endpoint stays protected and does not make owner profiles public", () => {
  const controller = readFileSync(
    resolve("src/api/boat/controllers/boat.ts"),
    "utf8"
  );
  const route = readFileSync(
    resolve("src/api/boat/routes/owner-contact.ts"),
    "utf8"
  );

  assert.match(route, /auth:\s*false/);
  assert.match(controller, /owner_contacts_locked/);
  assert.match(controller, /x-sharmar-internal-secret/);
  assert.doesNotMatch(controller, /ctx\.body\s*=\s*row/);
  assert.doesNotMatch(controller, /password/i);
});
