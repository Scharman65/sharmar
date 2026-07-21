import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const frontendRoute = fs.readFileSync(
  path.join(root, "app/api/admin/dashboard/route.ts"),
  "utf8"
);

const cmsController = fs.readFileSync(
  path.join(
    root,
    "../cms/src/api/admin-dashboard/controllers/admin-dashboard.ts"
  ),
  "utf8"
);

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }

  console.log(`PASS: ${message}`);
}

assert(
  !frontendRoute.includes('"fields[22]=reviewed_by"'),
  "boat query does not request reviewed_by"
);

assert(
  !/populate\[boat\]\[fields\].*owner_user_id/.test(frontendRoute),
  "experience query does not populate owner_user_id"
);

assert(
  !/populate\[boat\]\[fields\].*created_by_id/.test(frontendRoute),
  "experience query does not populate created_by_id"
);

assert(
  frontendRoute.includes('requireAdminSession("dashboard")'),
  "dashboard remains protected by admin session"
);

assert(
  frontendRoute.includes("const moderationEvents = eventResult.ok ?"),
  "missing moderation events remain non-fatal"
);

assert(
  frontendRoute.includes("Could not load moderation events"),
  "missing moderation events produce a safe warning"
);

assert(
  frontendRoute.includes("process.env.PAYMENTS_ADMIN_TOKEN"),
  "frontend supports PAYMENTS_ADMIN_TOKEN"
);

assert(
  frontendRoute.includes("process.env.SHARMAR_OWNER_ACTION_TOKEN"),
  "frontend supports SHARMAR_OWNER_ACTION_TOKEN"
);

assert(
  cmsController.includes("function adminTokens()"),
  "CMS builds an allowlist of internal tokens"
);

assert(
  cmsController.includes("process.env.PAYMENTS_ADMIN_TOKEN"),
  "CMS accepts PAYMENTS_ADMIN_TOKEN"
);

assert(
  cmsController.includes("process.env.SHARMAR_OWNER_ACTION_TOKEN"),
  "CMS accepts SHARMAR_OWNER_ACTION_TOKEN"
);

assert(
  cmsController.includes("timingSafeEqual"),
  "CMS compares internal tokens safely"
);

assert(
  cmsController.includes("expectedTokens.some"),
  "CMS checks the supplied token against the allowlist"
);

assert(
  cmsController.includes('ctx.request.headers["x-admin-token"]'),
  "CMS still requires the x-admin-token header"
);

assert(
  cmsController.includes("ctx.status = 401"),
  "CMS still rejects invalid tokens"
);

console.log("ADMIN_DASHBOARD_REGRESSION_CHECK=PASS");
