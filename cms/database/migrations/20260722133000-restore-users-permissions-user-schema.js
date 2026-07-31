"use strict";

module.exports = {
  async up(knex) {
    const hasUsers = await knex.schema.hasTable("up_users");

    if (!hasUsers) {
      return;
    }

    const definitions = [
      ["username", (table) => table.string("username", 255)],
      ["email", (table) => table.string("email", 255)],
      ["provider", (table) => table.string("provider", 255)],
      ["password", (table) => table.string("password", 255)],
      [
        "reset_password_token",
        (table) => table.string("reset_password_token", 255),
      ],
      [
        "confirmation_token",
        (table) => table.string("confirmation_token", 255),
      ],
      [
        "confirmed",
        (table) => table.boolean("confirmed").defaultTo(false),
      ],
      [
        "blocked",
        (table) => table.boolean("blocked").defaultTo(false),
      ],
    ];

    const missingColumns = [];

    for (const [column] of definitions) {
      const exists = await knex.schema.hasColumn(
        "up_users",
        column
      );

      if (!exists) {
        missingColumns.push(column);
      }
    }

    const usernameIndexName = "up_users_username_unique";

    const usernameIndexExists = Boolean(
      await knex("pg_indexes")
        .where({
          schemaname: "public",
          tablename: "up_users",
          indexname: usernameIndexName,
        })
        .first()
    );

    if (
      missingColumns.length === 0 &&
      usernameIndexExists
    ) {
      return;
    }

    const [{ count }] = await knex("up_users")
      .count({ count: "*" });

    const userCount = Number(count);

    if (userCount !== 0) {
      throw new Error(
        "Refusing users schema repair: " +
          `up_users contains ${userCount} rows; ` +
          `missing columns=${missingColumns.join(",") || "none"}; ` +
          `username index=${usernameIndexExists ? "present" : "missing"}`
      );
    }

    for (const [column, add] of definitions) {
      if (!missingColumns.includes(column)) {
        continue;
      }

      await knex.schema.alterTable(
        "up_users",
        (table) => add(table)
      );
    }

    if (!usernameIndexExists) {
      await knex.raw(
        'create unique index "up_users_username_unique" ' +
          'on "public"."up_users" ("username")'
      );
    }
  },

  async down() {
    // Intentionally irreversible.
  },
};
