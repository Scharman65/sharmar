"use strict";

module.exports = {
  async up(knex) {
    await knex.raw(`
      CREATE OR REPLACE FUNCTION public.hold_booking(
        p_boat_id integer,
        p_slot_start_utc timestamp without time zone,
        p_slot_end_utc timestamp without time zone,
        p_deposit_rate numeric DEFAULT 0.20,
        p_hold_minutes integer DEFAULT 15
      )
      RETURNS TABLE(
        ok boolean,
        code text,
        out_booking_id integer,
        out_public_id uuid,
        out_expires_at timestamp without time zone
      )
      LANGUAGE plpgsql
      AS $function$
      DECLARE
        v_document_id text;
        v_tz text;
        v_local_start timestamp;
        v_local_end timestamp;
        v_weekday integer;
        v_has_custom_rules boolean;
        v_exp timestamp;
        v_id integer;
        v_pub uuid;
      BEGIN
        IF p_slot_start_utc IS NULL
          OR p_slot_end_utc IS NULL
          OR NOT (p_slot_start_utc < p_slot_end_utc)
        THEN
          RETURN QUERY SELECT false, 'INVALID_SLOT', NULL::int, NULL::uuid, NULL::timestamp;
          RETURN;
        END IF;

        PERFORM public.expire_holds();

        SELECT b.document_id, COALESCE(NULLIF(b.timezone, ''), 'Europe/Podgorica')
        INTO v_document_id, v_tz
        FROM public.boats b
        WHERE b.id = p_boat_id
        LIMIT 1;

        IF v_document_id IS NULL OR v_tz IS NULL THEN
          RETURN QUERY SELECT false, 'INVALID_SLOT', NULL::int, NULL::uuid, NULL::timestamp;
          RETURN;
        END IF;

        v_local_start := (p_slot_start_utc AT TIME ZONE 'UTC') AT TIME ZONE v_tz;
        v_local_end := (p_slot_end_utc AT TIME ZONE 'UTC') AT TIME ZONE v_tz;

        IF v_local_start::date <> v_local_end::date THEN
          RETURN QUERY SELECT false, 'INVALID_SLOT', NULL::int, NULL::uuid, NULL::timestamp;
          RETURN;
        END IF;

        v_weekday := EXTRACT(ISODOW FROM v_local_start)::int - 1;

        IF EXISTS (
          SELECT 1
          FROM public.boat_blackouts x
          JOIN public.boats b ON b.id = x.boat_id
          WHERE b.document_id = v_document_id
            AND p_slot_start_utc < x.end_utc
            AND p_slot_end_utc > x.start_utc
        ) THEN
          RETURN QUERY SELECT false, 'INVALID_SLOT', NULL::int, NULL::uuid, NULL::timestamp;
          RETURN;
        END IF;

        SELECT EXISTS (
          SELECT 1
          FROM public.boat_availability_rules r
          JOIN public.boats b ON b.id = r.boat_id
          WHERE b.document_id = v_document_id
            AND r.active = true
        ) INTO v_has_custom_rules;

        IF v_has_custom_rules
          AND NOT EXISTS (
            SELECT 1
            FROM public.boat_availability_rules r
            JOIN public.boats b ON b.id = r.boat_id
            WHERE b.document_id = v_document_id
              AND r.active = true
              AND r.weekday = v_weekday
              AND v_local_start::time >= r.start_time_local
              AND v_local_end::time <= r.end_time_local
          )
        THEN
          RETURN QUERY SELECT false, 'INVALID_SLOT', NULL::int, NULL::uuid, NULL::timestamp;
          RETURN;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM public.bookings bk
          JOIN public.boats b ON b.id = bk.boat_id
          WHERE b.document_id = v_document_id
            AND bk.status IN ('hold','deposit_paid','paid_pending_owner','confirmed')
            AND p_slot_start_utc < bk.slot_end_utc
            AND p_slot_end_utc > bk.slot_start_utc
        ) THEN
          RETURN QUERY SELECT false, 'OCCUPIED', NULL::int, NULL::uuid, NULL::timestamp;
          RETURN;
        END IF;

        v_exp := now() + make_interval(mins => GREATEST(p_hold_minutes, 1));

        INSERT INTO public.bookings (
          boat_id, slot_start_utc, slot_end_utc, status,
          deposit_rate, currency, created_at, expires_at
        ) VALUES (
          p_boat_id, p_slot_start_utc, p_slot_end_utc, 'hold',
          p_deposit_rate, 'EUR', now(), v_exp
        )
        RETURNING bookings.id, bookings.public_id, bookings.expires_at
        INTO v_id, v_pub, v_exp;

        RETURN QUERY SELECT true, 'CREATED', v_id, v_pub, v_exp;
        RETURN;
      EXCEPTION
        WHEN unique_violation THEN
          RETURN QUERY SELECT false, 'OCCUPIED', NULL::int, NULL::uuid, NULL::timestamp;
          RETURN;
      END;
      $function$;

      CREATE OR REPLACE FUNCTION public.hold_booking(
        p_boat_id integer,
        p_slot_start_utc timestamp with time zone,
        p_slot_end_utc timestamp with time zone,
        p_deposit_rate numeric DEFAULT 0.20,
        p_hold_minutes integer DEFAULT 15
      )
      RETURNS TABLE(
        ok boolean,
        code text,
        out_booking_id integer,
        out_public_id uuid,
        out_expires_at timestamp without time zone
      )
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        RETURN QUERY
        SELECT *
        FROM public.hold_booking(
          p_boat_id,
          p_slot_start_utc AT TIME ZONE 'UTC',
          p_slot_end_utc AT TIME ZONE 'UTC',
          p_deposit_rate,
          p_hold_minutes
        );
      END;
      $function$;
    `);
  },

  async down() {
    // Intentionally irreversible: restoring the previous function would
    // reintroduce the calendar/hold validation mismatch.
  },
};
