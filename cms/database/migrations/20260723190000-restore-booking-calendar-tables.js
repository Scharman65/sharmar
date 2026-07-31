"use strict";

module.exports = {
  async up(knex) {
    await knex.raw(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `);

    await knex.raw(`
      CREATE EXTENSION IF NOT EXISTS btree_gist;
    `);

    await knex.raw(`
      CREATE SEQUENCE IF NOT EXISTS
        public.bookings_id_seq
        AS integer;
    `);

    await knex.raw(`
      CREATE TABLE IF NOT EXISTS public.bookings (
        id integer NOT NULL
          DEFAULT nextval(
            'public.bookings_id_seq'::regclass
          ),
        public_id uuid NOT NULL DEFAULT gen_random_uuid(),
        boat_id integer NOT NULL,
        slot_start_utc timestamp with time zone NOT NULL,
        slot_end_utc timestamp with time zone NOT NULL,
        status text NOT NULL,
        deposit_rate numeric,
        deposit_amount numeric,
        currency text DEFAULT 'EUR'::text,
        customer_name text,
        customer_phone text,
        customer_email text,
        created_at timestamp with time zone DEFAULT now(),
        expires_at timestamp with time zone,
        owner_decision_at timestamp with time zone,
        owner_decision_by integer,
        decline_reason text,
        confirmed_at timestamp with time zone,
        declined_at timestamp with time zone,
        payment_intent_id text,
        refund_id text,
        owner_decision text
      );
    `);

    await knex.raw(`
      ALTER SEQUENCE public.bookings_id_seq
        OWNED BY public.bookings.id;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'bookings_pkey'
            AND conrelid = 'public.bookings'::regclass
        ) THEN
          ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_pkey
            PRIMARY KEY (id);
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'bookings_boat_id_fkey'
            AND conrelid = 'public.bookings'::regclass
        ) THEN
          ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_boat_id_fkey
            FOREIGN KEY (boat_id)
            REFERENCES public.boats(id)
            ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'bookings_status_check'
            AND conrelid = 'public.bookings'::regclass
        ) THEN
          ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_status_check
            CHECK (
              status IN (
                'hold',
                'deposit_paid',
                'paid_pending_owner',
                'confirmed',
                'declined',
                'cancelled',
                'expired'
              )
            );
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'bookings_time_check'
            AND conrelid = 'public.bookings'::regclass
        ) THEN
          ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_time_check
            CHECK (slot_start_utc < slot_end_utc);
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'bookings_owner_decision_consistency_v1'
            AND conrelid = 'public.bookings'::regclass
        ) THEN
          ALTER TABLE public.bookings
            ADD CONSTRAINT
              bookings_owner_decision_consistency_v1
            CHECK (
              owner_decision IS NULL
              OR (
                owner_decision IN ('confirmed', 'declined')
                AND owner_decision_at IS NOT NULL
                AND (
                  (
                    owner_decision = 'confirmed'
                    AND confirmed_at IS NOT NULL
                    AND declined_at IS NULL
                  )
                  OR
                  (
                    owner_decision = 'declined'
                    AND declined_at IS NOT NULL
                    AND confirmed_at IS NULL
                  )
                )
              )
            );
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'bookings_owner_decision_not_after_expiry_v1'
            AND conrelid = 'public.bookings'::regclass
        ) THEN
          ALTER TABLE public.bookings
            ADD CONSTRAINT
              bookings_owner_decision_not_after_expiry_v1
            CHECK (
              owner_decision IS NULL
              OR expires_at IS NULL
              OR owner_decision_at <= expires_at
            );
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS
        bookings_boat_start_end_idx
      ON public.bookings
        (boat_id, slot_start_utc, slot_end_utc);
    `);

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS
        bookings_status_idx
      ON public.bookings (status);
    `);

    await knex.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        bookings_unique_active_slot_v2
      ON public.bookings
        (boat_id, slot_start_utc, slot_end_utc)
      WHERE status IN (
        'hold',
        'deposit_paid',
        'paid_pending_owner',
        'confirmed'
      );
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'bookings_no_overlap_active_v1'
            AND conrelid = 'public.bookings'::regclass
        ) THEN
          ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_no_overlap_active_v1
            EXCLUDE USING gist (
              boat_id WITH =,
              tstzrange(
                slot_start_utc,
                slot_end_utc,
                '[)'
              ) WITH &&
            )
            WHERE (
              status IN (
                'hold',
                'deposit_paid',
                'paid_pending_owner',
                'confirmed'
              )
            );
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      CREATE SEQUENCE IF NOT EXISTS
        public.boat_availability_rules_id_seq
        AS integer;
    `);

    await knex.raw(`
      CREATE TABLE IF NOT EXISTS public.boat_availability_rules (
        id integer NOT NULL
          DEFAULT nextval(
            'public.boat_availability_rules_id_seq'::regclass
          ),
        boat_id integer NOT NULL,
        weekday integer NOT NULL,
        start_time_local time without time zone NOT NULL,
        end_time_local time without time zone NOT NULL,
        active boolean DEFAULT true,
        created_at timestamp without time zone DEFAULT now()
      );
    `);

    await knex.raw(`
      ALTER SEQUENCE public.boat_availability_rules_id_seq
        OWNED BY public.boat_availability_rules.id;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'boat_availability_rules_pkey'
            AND conrelid =
              'public.boat_availability_rules'::regclass
        ) THEN
          ALTER TABLE public.boat_availability_rules
            ADD CONSTRAINT boat_availability_rules_pkey
            PRIMARY KEY (id);
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'boat_availability_rules_weekday_check'
            AND conrelid =
              'public.boat_availability_rules'::regclass
        ) THEN
          ALTER TABLE public.boat_availability_rules
            ADD CONSTRAINT
              boat_availability_rules_weekday_check
            CHECK (weekday >= 0 AND weekday <= 6);
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'boat_availability_rules_boat_id_fkey'
            AND conrelid =
              'public.boat_availability_rules'::regclass
        ) THEN
          ALTER TABLE public.boat_availability_rules
            ADD CONSTRAINT
              boat_availability_rules_boat_id_fkey
            FOREIGN KEY (boat_id)
            REFERENCES public.boats(id)
            ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS
        boat_availability_rules_boat_weekday_idx
      ON public.boat_availability_rules
        (boat_id, weekday)
      WHERE active = true;
    `);

    await knex.raw(`
      CREATE SEQUENCE IF NOT EXISTS
        public.boat_blackouts_id_seq
        AS integer;
    `);

    await knex.raw(`
      CREATE TABLE IF NOT EXISTS public.boat_blackouts (
        id integer NOT NULL
          DEFAULT nextval(
            'public.boat_blackouts_id_seq'::regclass
          ),
        boat_id integer NOT NULL,
        start_utc timestamp without time zone NOT NULL,
        end_utc timestamp without time zone NOT NULL,
        reason text,
        created_at timestamp without time zone DEFAULT now()
      );
    `);

    await knex.raw(`
      ALTER SEQUENCE public.boat_blackouts_id_seq
        OWNED BY public.boat_blackouts.id;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'boat_blackouts_pkey'
            AND conrelid =
              'public.boat_blackouts'::regclass
        ) THEN
          ALTER TABLE public.boat_blackouts
            ADD CONSTRAINT boat_blackouts_pkey
            PRIMARY KEY (id);
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'boat_blackouts_time_check'
            AND conrelid =
              'public.boat_blackouts'::regclass
        ) THEN
          ALTER TABLE public.boat_blackouts
            ADD CONSTRAINT boat_blackouts_time_check
            CHECK (start_utc < end_utc);
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'boat_blackouts_boat_id_fkey'
            AND conrelid =
              'public.boat_blackouts'::regclass
        ) THEN
          ALTER TABLE public.boat_blackouts
            ADD CONSTRAINT
              boat_blackouts_boat_id_fkey
            FOREIGN KEY (boat_id)
            REFERENCES public.boats(id)
            ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS
        boat_blackouts_boat_start_end_idx
      ON public.boat_blackouts
        (boat_id, start_utc, end_utc);
    `);
  },

  async down() {
    throw new Error(
      "Down migration is not supported for booking calendar tables"
    );
  },
};
