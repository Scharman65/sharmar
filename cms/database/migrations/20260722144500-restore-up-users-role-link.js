"use strict";

/**
 * Restore the standard Strapi Users & Permissions many-to-one relation:
 *
 *   plugin::users-permissions.user.role
 *
 * The production database previously lost the physical relation table during
 * a malformed user content-type extension. A clean Strapi 5.32.0 laboratory
 * generates exactly:
 *
 *   up_users_role_lnk
 *     id
 *     user_id -> up_users.id ON DELETE CASCADE
 *     role_id -> up_roles.id ON DELETE CASCADE
 *     user_ord double precision
 *
 * This migration is intentionally guarded for the empty owner pilot baseline.
 */
module.exports = {
  async up(knex) {
    const requiredTables = [
      "up_users",
      "up_roles",
      "owner_profiles",
      "owner_profiles_user_lnk",
    ];

    for (const table of requiredTables) {
      const exists = await knex.schema.hasTable(table);
      if (!exists) {
        throw new Error(`Required table is missing: ${table}`);
      }
    }

    const existingLinkTable = await knex.schema.hasTable("up_users_role_lnk");
    if (existingLinkTable) {
      throw new Error(
        "Refusing user-role repair: up_users_role_lnk already exists"
      );
    }

    const countRows = async (table) => {
      const result = await knex(table).count({ count: "*" });
      return Number(result[0]?.count ?? 0);
    };

    const [users, profiles, profileLinks] = await Promise.all([
      countRows("up_users"),
      countRows("owner_profiles"),
      countRows("owner_profiles_user_lnk"),
    ]);

    if (users !== 0 || profiles !== 0 || profileLinks !== 0) {
      throw new Error(
        "Refusing user-role repair: owner baseline is not empty " +
          `(up_users=${users}, owner_profiles=${profiles}, ` +
          `owner_profiles_user_lnk=${profileLinks})`
      );
    }

    const roleResult = await knex("up_roles")
      .whereIn("type", ["authenticated", "public"])
      .count({ count: "*" });

    const requiredRoleCount = Number(roleResult[0]?.count ?? 0);

    if (requiredRoleCount !== 2) {
      throw new Error(
        `Refusing user-role repair: required role count is ${requiredRoleCount}`
      );
    }

    await knex.raw(`
      create table "public"."up_users_role_lnk" (
        "id" serial primary key,
        "user_id" integer null,
        "role_id" integer null,
        "user_ord" double precision null,
        constraint "up_users_role_lnk_fk"
          foreign key ("user_id")
          references "public"."up_users" ("id")
          on delete cascade,
        constraint "up_users_role_lnk_ifk"
          foreign key ("role_id")
          references "public"."up_roles" ("id")
          on delete cascade
      )
    `);

    await knex.raw(`
      create index "up_users_role_lnk_fk"
      on "public"."up_users_role_lnk" ("user_id")
    `);

    await knex.raw(`
      create index "up_users_role_lnk_ifk"
      on "public"."up_users_role_lnk" ("role_id")
    `);

    await knex.raw(`
      create index "up_users_role_lnk_oifk"
      on "public"."up_users_role_lnk" ("user_ord")
    `);

    await knex.raw(`
      create unique index "up_users_role_lnk_uq"
      on "public"."up_users_role_lnk" ("user_id", "role_id")
    `);
  },

  async down() {
    // Intentionally irreversible. Dropping this relation after owner
    // registration becomes active could detach users from their roles.
  },
};
