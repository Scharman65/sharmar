"use strict";

module.exports = {
  async up(knex) {
    await knex.raw(`
      create table if not exists public.notification_deliveries (
        id bigserial primary key,
        deduplication_key text not null unique,
        request_id integer,
        public_token text,
        event_type text not null,
        channel text not null,
        provider text,
        status text not null default 'claimed',
        attempted_at timestamptz not null default now(),
        accepted_at timestamptz,
        provider_message_id_hash text,
        error_code text,
        metadata jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    await knex.raw(`
      create index if not exists notification_deliveries_request_idx
        on public.notification_deliveries (request_id, event_type, channel);
    `);
  },
};
