import type { Core } from "@strapi/strapi";

function isPostgres(strapi: Core.Strapi): boolean {
  const client = strapi.db?.connection?.client?.config?.client;
  return ["pg", "postgres", "postgresql"].includes(String(client ?? ""));
}

async function ensureExpireHoldsFunction(strapi: Core.Strapi): Promise<void> {
  await strapi.db.connection.raw(`
    CREATE OR REPLACE FUNCTION public.expire_holds()
    RETURNS integer
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      v_updated integer := 0;
    BEGIN
      IF to_regclass('public.bookings') IS NULL THEN
        RETURN 0;
      END IF;

      UPDATE public.bookings
      SET status = 'expired'
      WHERE status = 'hold'
        AND expires_at IS NOT NULL
        AND expires_at <= now();

      GET DIAGNOSTICS v_updated = ROW_COUNT;
      RETURN v_updated;
    END;
    $function$;
  `);
}

async function ensureBookingCalendarForeignKeys(strapi: Core.Strapi): Promise<void> {
  await strapi.db.connection.raw(`
    DO $$
    BEGIN
      IF to_regclass('public.boats') IS NOT NULL
        AND to_regclass('public.bookings') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'bookings_boat_id_fkey'
            AND conrelid = 'public.bookings'::regclass
        )
      THEN
        ALTER TABLE public.bookings
          ADD CONSTRAINT bookings_boat_id_fkey
          FOREIGN KEY (boat_id)
          REFERENCES public.boats(id)
          ON DELETE CASCADE
          NOT VALID;
      END IF;

      IF to_regclass('public.boats') IS NOT NULL
        AND to_regclass('public.boat_availability_rules') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'boat_availability_rules_boat_id_fkey'
            AND conrelid = 'public.boat_availability_rules'::regclass
        )
      THEN
        ALTER TABLE public.boat_availability_rules
          ADD CONSTRAINT boat_availability_rules_boat_id_fkey
          FOREIGN KEY (boat_id)
          REFERENCES public.boats(id)
          ON DELETE CASCADE
          NOT VALID;
      END IF;

      IF to_regclass('public.boats') IS NOT NULL
        AND to_regclass('public.boat_blackouts') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'boat_blackouts_boat_id_fkey'
            AND conrelid = 'public.boat_blackouts'::regclass
        )
      THEN
        ALTER TABLE public.boat_blackouts
          ADD CONSTRAINT boat_blackouts_boat_id_fkey
          FOREIGN KEY (boat_id)
          REFERENCES public.boats(id)
          ON DELETE CASCADE
          NOT VALID;
      END IF;
    END
    $$;
  `);
}

async function ensureAdminMarketplaceInflowAnalytics(strapi: Core.Strapi): Promise<void> {
  await strapi.db.connection.raw(`
    DO $$
    BEGIN
      IF to_regclass('public.booking_requests') IS NOT NULL THEN
        ALTER TABLE public.booking_requests
          ADD COLUMN IF NOT EXISTS external_refund_status text NOT NULL DEFAULT 'none',
          ADD COLUMN IF NOT EXISTS external_refund_marked_at timestamptz NULL,
          ADD COLUMN IF NOT EXISTS external_refund_completed_at timestamptz NULL;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'booking_requests_external_refund_status_chk'
            AND conrelid = 'public.booking_requests'::regclass
        )
        THEN
          ALTER TABLE public.booking_requests
            ADD CONSTRAINT booking_requests_external_refund_status_chk
            CHECK (
              external_refund_status IN ('none', 'required', 'completed')
              AND (
                (external_refund_status = 'none'
                  AND external_refund_marked_at IS NULL
                  AND external_refund_completed_at IS NULL)
                OR (external_refund_status = 'required'
                  AND external_refund_marked_at IS NOT NULL
                  AND external_refund_completed_at IS NULL)
                OR (external_refund_status = 'completed'
                  AND external_refund_marked_at IS NOT NULL
                  AND external_refund_completed_at IS NOT NULL)
              )
            ) NOT VALID;
        END IF;

        CREATE INDEX IF NOT EXISTS booking_requests_created_at_idx
          ON public.booking_requests (created_at);
        CREATE INDEX IF NOT EXISTS booking_requests_status_created_at_idx
          ON public.booking_requests (status, created_at);
        CREATE INDEX IF NOT EXISTS booking_requests_external_refund_status_idx
          ON public.booking_requests (external_refund_status);
      END IF;

      IF to_regclass('public.payments') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS payments_created_at_idx
          ON public.payments (created_at);
        CREATE INDEX IF NOT EXISTS payments_status_created_at_idx
          ON public.payments (status, created_at);
        CREATE INDEX IF NOT EXISTS payments_booking_request_status_created_at_idx
          ON public.payments (booking_request_id, status, created_at);
        CREATE INDEX IF NOT EXISTS payments_provider_created_at_idx
          ON public.payments (provider, created_at);
        CREATE INDEX IF NOT EXISTS payments_provider_intent_created_at_idx
          ON public.payments (provider, provider_intent_id, created_at);
      END IF;

      IF to_regclass('public.booking_requests_boat_lnk') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS booking_requests_boat_lnk_booking_request_id_idx
          ON public.booking_requests_boat_lnk (booking_request_id);
        CREATE INDEX IF NOT EXISTS booking_requests_boat_lnk_boat_id_idx
          ON public.booking_requests_boat_lnk (boat_id);
      END IF;

      IF to_regclass('public.boats') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS boats_document_id_idx
          ON public.boats (document_id);
      END IF;

      IF to_regclass('public.boats_home_marina_lnk') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS boats_home_marina_lnk_boat_id_idx
          ON public.boats_home_marina_lnk (boat_id);
      END IF;
    END
    $$;
  `);
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    if (!isPostgres(strapi)) {
      return;
    }

    await ensureExpireHoldsFunction(strapi);
    await ensureBookingCalendarForeignKeys(strapi);
    await ensureAdminMarketplaceInflowAnalytics(strapi);
  },
};
