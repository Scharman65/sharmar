"use strict";

module.exports = {
  async up(knex) {
    await knex.raw(`
      CREATE OR REPLACE FUNCTION public.get_boat_availability(
        p_boat_id integer,
        p_date_from date,
        p_date_to date,
        p_slot_minutes integer DEFAULT 60
      )
      RETURNS TABLE(
        slot_start_utc timestamp without time zone,
        slot_end_utc timestamp without time zone
      )
      LANGUAGE sql
      STABLE
      AS $function$
      WITH
      params AS (
        SELECT
          p_boat_id AS requested_boat_id,
          p_date_from AS date_from,
          p_date_to AS date_to,
          GREATEST(p_slot_minutes, 1) AS slot_minutes
      ),
      requested_boat AS (
        SELECT
          b.id,
          b.document_id,
          COALESCE(NULLIF(b.timezone, ''), 'Europe/Podgorica') AS tz
        FROM public.boats b
        JOIN params p ON p.requested_boat_id = b.id
        LIMIT 1
      ),
      logical_boats AS (
        SELECT b.id
        FROM public.boats b
        JOIN requested_boat rb ON rb.document_id = b.document_id
      ),
      days AS (
        SELECT d::date AS day_local
        FROM params p
        CROSS JOIN generate_series(p.date_from, p.date_to, interval '1 day') AS d
      ),
      custom_rules AS (
        SELECT DISTINCT r.weekday, r.start_time_local, r.end_time_local
        FROM public.boat_availability_rules r
        JOIN logical_boats lb ON lb.id = r.boat_id
        WHERE r.active = true
      ),
      effective_rules AS (
        SELECT weekday, start_time_local, end_time_local
        FROM custom_rules
        UNION ALL
        SELECT weekday, time '00:00:00', time '24:00:00'
        FROM generate_series(0, 6) AS weekday
        WHERE NOT EXISTS (SELECT 1 FROM custom_rules)
      ),
      windows AS (
        SELECT
          ((d.day_local::timestamp + r.start_time_local)
            AT TIME ZONE rb.tz) AT TIME ZONE 'UTC' AS win_start_utc,
          ((d.day_local::timestamp + r.end_time_local)
            AT TIME ZONE rb.tz) AT TIME ZONE 'UTC' AS win_end_utc,
          make_interval(mins => p.slot_minutes) AS slot_iv
        FROM params p
        JOIN requested_boat rb ON true
        JOIN days d ON true
        JOIN effective_rules r
          ON r.weekday =
            CASE EXTRACT(ISODOW FROM d.day_local)::int
              WHEN 1 THEN 0 WHEN 2 THEN 1 WHEN 3 THEN 2
              WHEN 4 THEN 3 WHEN 5 THEN 4 WHEN 6 THEN 5
              WHEN 7 THEN 6
            END
      ),
      slots AS (
        SELECT
          w.win_start_utc + (w.slot_iv * s.n) AS slot_start_utc,
          w.win_start_utc + (w.slot_iv * (s.n + 1)) AS slot_end_utc
        FROM windows w
        JOIN LATERAL (
          SELECT generate_series(
            0,
            GREATEST(
              0,
              FLOOR(
                EXTRACT(epoch FROM (w.win_end_utc - w.win_start_utc))
                / EXTRACT(epoch FROM w.slot_iv)
              )::int - 1
            )
          ) AS n
        ) s ON true
        WHERE w.win_start_utc < w.win_end_utc
      )
      SELECT s.slot_start_utc, s.slot_end_utc
      FROM slots s
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.bookings b
        JOIN logical_boats lb ON lb.id = b.boat_id
        WHERE b.status IN (
          'hold',
          'deposit_paid',
          'paid_pending_owner',
          'confirmed'
        )
          AND s.slot_start_utc < b.slot_end_utc
          AND s.slot_end_utc > b.slot_start_utc
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.boat_blackouts x
        JOIN logical_boats lb ON lb.id = x.boat_id
        WHERE s.slot_start_utc < x.end_utc
          AND s.slot_end_utc > x.start_utc
      )
      ORDER BY s.slot_start_utc;
      $function$;
    `);
  },

  async down() {
    // Intentionally irreversible.
  },
};
