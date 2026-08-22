"use strict";

const OBJECTS = {
  statusCheck: "booking_requests_external_refund_status_chk",
  brCreated: "booking_requests_created_at_idx",
  brStatusCreated: "booking_requests_status_created_at_idx",
  brExternalRefund: "booking_requests_external_refund_status_idx",
  paymentsCreated: "payments_created_at_idx",
  paymentsStatusCreated: "payments_status_created_at_idx",
  paymentsBookingStatusCreated: "payments_booking_request_status_created_at_idx",
  paymentsProviderCreated: "payments_provider_created_at_idx",
  paymentsProviderIntentCreated: "payments_provider_intent_created_at_idx",
  brBoatBooking: "booking_requests_boat_lnk_booking_request_id_idx",
  brBoatBoat: "booking_requests_boat_lnk_boat_id_idx",
  boatDocument: "boats_document_id_idx",
  boatMarinaBoat: "boats_home_marina_lnk_boat_id_idx",
};

module.exports = {
  async up(knex) {
    await knex.raw(`
      alter table public.booking_requests
        add column if not exists external_refund_status text not null default 'none',
        add column if not exists external_refund_marked_at timestamptz null,
        add column if not exists external_refund_completed_at timestamptz null
    `);

    await knex.raw(`
      do $$
      begin
        if not exists (
          select 1
          from pg_constraint
          where conname = '${OBJECTS.statusCheck}'
            and conrelid = 'public.booking_requests'::regclass
        ) then
          alter table public.booking_requests
            add constraint ${OBJECTS.statusCheck}
            check (
              external_refund_status in ('none', 'required', 'completed')
              and (
                (external_refund_status = 'none'
                  and external_refund_marked_at is null
                  and external_refund_completed_at is null)
                or (external_refund_status = 'required'
                  and external_refund_marked_at is not null
                  and external_refund_completed_at is null)
                or (external_refund_status = 'completed'
                  and external_refund_marked_at is not null
                  and external_refund_completed_at is not null)
              )
            ) not valid;
        end if;
      end $$;
    `);

    await knex.raw(`
      create index if not exists ${OBJECTS.brCreated}
        on public.booking_requests (created_at);
      create index if not exists ${OBJECTS.brStatusCreated}
        on public.booking_requests (status, created_at);
      create index if not exists ${OBJECTS.brExternalRefund}
        on public.booking_requests (external_refund_status);
      create index if not exists ${OBJECTS.paymentsCreated}
        on public.payments (created_at);
      create index if not exists ${OBJECTS.paymentsStatusCreated}
        on public.payments (status, created_at);
      create index if not exists ${OBJECTS.paymentsBookingStatusCreated}
        on public.payments (booking_request_id, status, created_at);
      create index if not exists ${OBJECTS.paymentsProviderCreated}
        on public.payments (provider, created_at);
      create index if not exists ${OBJECTS.paymentsProviderIntentCreated}
        on public.payments (provider, provider_intent_id, created_at);
      create index if not exists ${OBJECTS.brBoatBooking}
        on public.booking_requests_boat_lnk (booking_request_id);
      create index if not exists ${OBJECTS.brBoatBoat}
        on public.booking_requests_boat_lnk (boat_id);
      create index if not exists ${OBJECTS.boatDocument}
        on public.boats (document_id);
      create index if not exists ${OBJECTS.boatMarinaBoat}
        on public.boats_home_marina_lnk (boat_id);
    `);
  },

  async down(knex) {
    await knex.raw(`
      drop index if exists public.${OBJECTS.boatMarinaBoat};
      drop index if exists public.${OBJECTS.boatDocument};
      drop index if exists public.${OBJECTS.brBoatBoat};
      drop index if exists public.${OBJECTS.brBoatBooking};
      drop index if exists public.${OBJECTS.paymentsProviderIntentCreated};
      drop index if exists public.${OBJECTS.paymentsProviderCreated};
      drop index if exists public.${OBJECTS.paymentsBookingStatusCreated};
      drop index if exists public.${OBJECTS.paymentsStatusCreated};
      drop index if exists public.${OBJECTS.paymentsCreated};
      drop index if exists public.${OBJECTS.brExternalRefund};
      drop index if exists public.${OBJECTS.brStatusCreated};
      drop index if exists public.${OBJECTS.brCreated};
      alter table public.booking_requests
        drop constraint if exists ${OBJECTS.statusCheck},
        drop column if exists external_refund_completed_at,
        drop column if exists external_refund_marked_at,
        drop column if exists external_refund_status;
    `);
  },
};
