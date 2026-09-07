"use strict";

module.exports = {
  async up(knex) {
    const hasBoats = await knex.schema.hasTable("boats");

    if (!hasBoats) {
      return;
    }

    const exists = await knex.schema.hasColumn("boats", "timezone");

    if (!exists) {
      await knex.schema.alterTable("boats", (table) => {
        table.text("timezone").defaultTo("Europe/Podgorica");
      });
    }
  },

  async down() {},
};
