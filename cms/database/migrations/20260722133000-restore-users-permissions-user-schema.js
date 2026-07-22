"use strict";

/**
 * Restores the standard Strapi Users & Permissions columns after an
 * attributes-only extension schema replaced the plugin user model.
 *
 * Production guard: the migration refuses to operate on a non-empty
 * up_users table. The production reset established an empty owner dataset.
 */
module.exports = {
  async up(knex) {
    const hasUsers = await knex.schema.hasTable("up_users");
    if (!hasUsers) {
      throw new Error("up_users table is missing");
    }

    const [{ count }] = await knex("up_users").count({ count: "*" });
    if (Number(count) !== 0) {
      throw new Error(`Refusing users schema repair: up_users contains ${count} rows`);
    }

    const definitions = [
      ["username", (table) => table.string("username", 255)],
      ["email", (table) => table.string("email", 255)],
      ["provider", (table) => table.string("provider", 255)],
      ["password", (table) => table.string("password", 255)],
      ["reset_password_token", (table) => table.string("reset_password_token", 255)],
      ["confirmation_token", (table) => table.string("confirmation_token", 255)],
      ["confirmed", (table) => table.boolean("confirmed").defaultTo(false)],
      ["blocked", (table) => table.boolean("blocked").defaultTo(false)],
    ];

    for (const [column, add] of definitions) {
      const exists = await knex.schema.hasColumn("up_users", column);
      if (!exists) {
        await knex.schema.alterTable("up_users", (table) => add(table));
      }
    }

    const usernameIndex = "up_users_username_unique";
    const usernameIndexExists = await knex("pg_indexes")
      .where({
        schemaname: "public",
        tablename: "up_users",
        indexname: usernameIndex,
      })
      .first();

    if (!usernameIndexExists) {
      await knex.raw(
        'create unique index "up_users_username_unique" on "public"."up_users" ("username")'
      );
    }
  },

  async down() {
    // Intentionally irreversible. Dropping authentication columns could
    // destroy owner accounts after registration becomes active.
  },
};
