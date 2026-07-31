"use strict";

module.exports = {
  async up(knex) {
    await knex.raw(`
      alter table if exists public.owner_profiles
        add column if not exists archived_at timestamptz;
    `);

    await knex.raw(`
      alter table if exists public.boats
        add column if not exists archived_at timestamptz;
    `);

    await knex.raw(`
      alter table if exists public.experiences
        add column if not exists archived_at timestamptz;
    `);

    await knex.raw(`
      alter table if exists public.up_users
        add column if not exists must_change_password
          boolean not null default false;
    `);

    const hasUsers = await knex.schema.hasTable("up_users");

    if (!hasUsers) {
      return;
    }

    const hasMustChangePassword = await knex.schema.hasColumn(
      "up_users",
      "must_change_password"
    );

    if (!hasMustChangePassword) {
      return;
    }

    await knex("up_users")
      .whereNull("must_change_password")
      .update({ must_change_password: false });
  },
};
