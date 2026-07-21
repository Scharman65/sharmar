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
        add column if not exists must_change_password boolean not null default false;
    `);

    await knex.raw(`
      update public.up_users
      set must_change_password = false
      where must_change_password is null;
    `);
  },
};
