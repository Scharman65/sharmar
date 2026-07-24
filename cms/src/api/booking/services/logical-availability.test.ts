import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repositoryRoot = path.resolve(
  __dirname,
  "../../../../.."
);

function read(relativePath: string): string {
  return fs.readFileSync(
    path.join(repositoryRoot, relativePath),
    "utf8"
  );
}

const migration = read(
  "cms/database/migrations/" +
    "20260723203000-logical-boat-availability.js"
);

const controller = read(
  "cms/src/api/booking/controllers/" +
    "owner-blackouts.ts"
);

const routes = read(
  "cms/src/api/booking/routes/" +
    "owner-blackouts.ts"
);

const dashboard = read(
  "frontend/app/[lang]/owner-dashboard/" +
    "OwnerDashboardClient.tsx"
);

const boatPage = read(
  "frontend/app/[lang]/boats/[slug]/page.tsx"
);

test(
  "availability resolves every Strapi row by document id",
  () => {
    assert.match(
      migration,
      /rb\.document_id\s*=\s*b\.document_id/
    );

    assert.match(
      migration,
      /JOIN logical_boats lb ON lb\.id = x\.boat_id/
    );

    assert.match(
      migration,
      /JOIN logical_boats lb ON lb\.id = b\.boat_id/
    );
  }
);

test(
  "availability is open by default without custom rules",
  () => {
    assert.match(
      migration,
      /generate_series\(0,\s*6\)/
    );

    assert.match(
      migration,
      /time '00:00:00'/
    );

    assert.match(
      migration,
      /time '24:00:00'/
    );

    assert.match(
      migration,
      /NOT EXISTS \(SELECT 1 FROM custom_rules\)/
    );
  }
);

test(
  "all active booking states block availability",
  () => {
    for (const status of [
      "hold",
      "deposit_paid",
      "paid_pending_owner",
      "confirmed",
    ]) {
      assert.match(
        migration,
        new RegExp(`'${status}'`)
      );
    }
  }
);

test(
  "owner blackout controller resolves the logical boat",
  () => {
    assert.match(
      controller,
      /resolveLogicalBoat/
    );

    assert.match(
      controller,
      /array_agg\(logical\.id/
    );

    assert.match(
      controller,
      /boat_id = any\(\?::int\[\]\)/
    );
  }
);

test(
  "CMS blackout routes use controller token protection",
  () => {
    assert.equal(
      (routes.match(/auth: false/g) || []).length,
      3
    );

    assert.doesNotMatch(
      routes,
      /auth: true/
    );

    assert.match(
      controller,
      /process\.env\.OWNER_API_TOKEN/
    );

    assert.equal(
      (
        controller.match(
          /requireOwnerApiToken\(ctx\)/g
        ) || []
      ).length,
      3
    );

    assert.match(
      controller,
      /owner_api_token_required/
    );
  }
);

test(
  "owner local time uses Europe Podgorica",
  () => {
    assert.match(
      dashboard,
      /timeZone = "Europe\/Podgorica"/
    );

    assert.match(
      dashboard,
      /timeZoneOffsetMs/
    );

    assert.doesNotMatch(
      dashboard,
      /T\$\{cleanTime\}:00\.000Z/
    );
  }
);

test(
  "calendar completion does not force a blackout",
  () => {
    assert.match(
      dashboard,
      /label: copy\.availabilityCalendar,\s*done: Boolean\(selectedBoat\.id\)/s
    );
  }
);

test(
  "public boat page exposes localized minimum rental duration",
  () => {
    assert.match(
      boatPage,
      /min_rental_hours/
    );

    assert.match(
      boatPage,
      /Minimum rental duration/
    );

    assert.match(
      boatPage,
      /Минимальная продолжительность аренды/
    );

    assert.match(
      boatPage,
      /Minimalno trajanje najma/
    );

    assert.match(
      boatPage,
      /localizedHourCount/
    );

    assert.doesNotMatch(
      boatPage,
      /from \$\{hours\} hours/
    );
  }
);
