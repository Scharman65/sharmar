"use strict";

async function up(knex) {
  await knex.schema.raw(`
    create table if not exists public.dodo_webhook_events (
      id bigserial primary key,
      webhook_id text not null unique,
      event_type text,
      provider_intent_id text,
      received_at timestamptz not null default now(),
      payload jsonb
    )
  `);
}

async function down() {
  throw new Error("Down migration is not supported for dodo_webhook_events");
}

module.exports = { up, down };
