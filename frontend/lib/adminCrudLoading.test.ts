import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = dirname(
  dirname(fileURLToPath(import.meta.url))
);

const manager = readFileSync(
  join(
    frontendRoot,
    "app/[lang]/admin/AdminCrudManager.tsx"
  ),
  "utf8"
);

test(
  "every admin CRUD section loads its typed endpoint",
  () => {
    assert.ok(
      manager.includes(
        "fetch(ADMIN_CRUD_ROUTES[entity]"
      )
    );

    assert.ok(
      manager.includes(
        "remoteRows ?? dashboardRows"
      )
    );

    assert.ok(
      manager.includes(
        "setRemoteRows(dashboardRows)"
      )
    );

    assert.doesNotMatch(
      manager,
      /if \(entity !== "media"\) return/
    );

    assert.doesNotMatch(
      manager,
      /entity === "media" \? remoteRows \?\? \[\] : dashboardRows/
    );
  }
);
