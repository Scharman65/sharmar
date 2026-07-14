import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

test("Stripe compatibility remains present while Dodo path is selectable", () => {
  const config = readFileSync(path.join(repoRoot, "cms/config/payments.ts"), "utf8");
  const controller = readFileSync(path.join(repoRoot, "cms/src/api/payment/controllers/payment.ts"), "utf8");
  const routes = readFileSync(path.join(repoRoot, "cms/src/api/payment/routes/payment.ts"), "utf8");

  assert.match(config, /provider:\s*env\("PAYMENT_PROVIDER",\s*"stripe"\)/);
  assert.match(config, /STRIPE_SECRET_KEY/);
  assert.match(config, /STRIPE_WEBHOOK_SECRET/);
  assert.match(config, /DODO_API_BASE_URL/);

  assert.match(controller, /paymentProvider === "dodo"/);
  assert.match(controller, /getStripeClient\(\)/);
  assert.match(controller, /stripe\.paymentIntents\.create/);
  assert.match(controller, /stripe\.webhooks\.constructEvent/);
  assert.match(controller, /where provider = 'dodo'/);
  assert.doesNotMatch(controller, /provider:\s*"stripe"[\s\S]{0,120}dodoProviderIntentId/);

  assert.match(routes, /path:\s*'\/payments\/intent'/);
  assert.match(routes, /path:\s*'\/payments\/webhook'/);
  assert.match(routes, /path:\s*'\/payments\/capture'/);
});
