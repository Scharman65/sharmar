export default {
  async health(ctx) {
    ctx.status = 200;
    ctx.body = { ok: true, service: 'payments', ts: new Date().toISOString() };
  },

  async createIntent(ctx) {
    ctx.set("X-Payments-Code","green_20260205_164849");
    const cfg = strapi.config.get("payments") as any;
    if (!cfg?.enabled) {
      ctx.status = 503;
      ctx.body = { error: "payments_disabled" };
      return;
    }

    const paymentProvider = String(cfg?.provider || "stripe").trim().toLowerCase();
    if (paymentProvider !== "stripe" && paymentProvider !== "dodo") {
      ctx.status = 503;
      ctx.body = { error: "unsupported_payment_provider", provider: paymentProvider };
      return;
    }

    const idk = String(
      ctx.request.headers["idempotency-key"] ||
        ctx.request.headers["x-idempotency-key"] ||
        ""
    ).trim();

    if (!idk) {
      ctx.status = 400;
      ctx.body = { error: "idempotency_key_required" };
      return;
    }

    const publicToken = String(
      (ctx.request.body &&
        (ctx.request.body.public_token || ctx.request.body.publicToken)) ||
        ""
    ).trim();

    if (!publicToken) {
      ctx.status = 400;
      ctx.body = { error: "public_token_required" };
      return;
    }

    const existing = await strapi.db.connection
      .select(
        "id",
        "provider",
        "provider_intent_id",
        "amount_cents",
        "currency",
        "status",
        "booking_request_id",
        "metadata"
      )
      .from("public.payments")
      .where("idempotency_key", idk)
      .first();

    if (existing) {
      const meta = (existing.metadata as any) || {};
      ctx.status = 200;
      ctx.body = {
        payment_id: existing.id,
        provider: existing.provider,
        provider_intent_id: existing.provider_intent_id,
        client_secret: meta.client_secret || null,
        amount_cents: existing.amount_cents,
        currency: existing.currency,
        status: existing.status,
        booking_request_id: existing.booking_request_id,
      };
      return;
    }

    const br = await strapi.db.query("api::booking-request.booking-request").findOne({
      where: { public_token: publicToken },
      select: ["id", "status", "public_token"],
    });

    if (!br) {
      ctx.status = 404;
      ctx.body = { error: "booking_request_not_found" };
      return;
    }

    const brStatus = String(br.status || "").toLowerCase();

    // Policy toggle:
    // - PAYMENTS_ALLOW_BEFORE_OWNER_APPROVAL=true  -> allow 'pending' (pay-first)
    // - otherwise                                 -> require 'approved' or 'confirmed'
    const allowBeforeOwner = String(process.env.PAYMENTS_ALLOW_BEFORE_OWNER_APPROVAL || "").toLowerCase() === "true";

    const okStatus = allowBeforeOwner
      ? (brStatus === "new" || brStatus === "pending" || brStatus === "approved" || brStatus === "confirmed")
      : (brStatus === "approved" || brStatus === "confirmed");

    if (!okStatus) {
      ctx.status = 409;
      ctx.body = {
        error: "owner_approval_required",
        status: br.status,
        allow_before_owner: allowBeforeOwner,
        required_statuses: allowBeforeOwner ? ["pending","approved","confirmed"] : ["approved","confirmed"],
      };
      return;
    }

    const r = await strapi.db.connection.raw(
      `
      select
        count(l.boat_id) as boats_cnt,
        min(l.boat_id) as boat_id,
        br.marketplace_fee_amount as marketplace_fee_amount,
        br.customer_total_amount as customer_total_amount,
        br.owner_amount as owner_amount,
        br.currency as br_currency,
        min(b.deposit) as deposit,\n        min(b.listing_type) as listing_type,\n        bool_and(coalesce(b.booking_enabled,false)) as booking_enabled,\n        min(b.currency) as currency
        , min(b.listing_type) as listing_type
        , min(b.booking_enabled) as booking_enabled

      from public.booking_requests br
      left join public.booking_requests_boat_lnk l
        on l.booking_request_id = br.id
      left join public.boats b
        on b.id = l.boat_id
      where br.id = ?
      group by br.id
      `,
      [br.id]
    );

    const row = (r && (r.rows?.[0] || (Array.isArray(r[0]) ? r[0][0] : r[0]))) as any;

    const boatsCnt = Number(row?.boats_cnt || 0);
    const boatId = row?.boat_id != null ? Number(row.boat_id) : null;
    const deposit = (row?.deposit) != null ? Number(row.deposit) : null;
    const marketplaceFeeAmount = (row?.marketplace_fee_amount) != null ? Number(row.marketplace_fee_amount) : null;
    const customerTotalAmount = (row?.customer_total_amount) != null ? Number(row.customer_total_amount) : null;
    const ownerAmount = (row?.owner_amount) != null ? Number(row.owner_amount) : null;
    const brCurrency = (row?.br_currency) != null ? String(row.br_currency).trim() : "";
        const listingType = (row?.listing_type) != null ? String(row.listing_type).trim().toLowerCase() : "";
        const bookingEnabled = Boolean(row?.booking_enabled);
        const currency = brCurrency || ((row?.currency) != null ? String(row.currency).trim() : "");
    if (boatsCnt !== 1 || !boatId) {
      ctx.status = 409;
      ctx.body = { error: "booking_request_boat_invalid", boats_cnt: boatsCnt };
      return;
    }
    if (!listingType) {
            ctx.status = 409;
            ctx.body = { error: "listing_type_not_configured" };
            return;
        }
        if (listingType !== "rent") {
            ctx.status = 409;
            ctx.body = { error: "listing_type_not_rent", listing_type: listingType };
            return;
        }
        if (!bookingEnabled) {
            ctx.status = 409;
            ctx.body = { error: "booking_disabled" };
            return;
        }


    const chargeAmount =
      marketplaceFeeAmount != null && Number.isFinite(marketplaceFeeAmount) && marketplaceFeeAmount > 0
        ? marketplaceFeeAmount
        : deposit;
    const amountSource =
      marketplaceFeeAmount != null && Number.isFinite(marketplaceFeeAmount) && marketplaceFeeAmount > 0
        ? "marketplace_fee"
        : "legacy_deposit";

    if (!chargeAmount || !Number.isFinite(chargeAmount) || !(chargeAmount > 0)) {

      ctx.status = 409;
      ctx.body = { error: amountSource === "legacy_deposit" ? "deposit_not_configured" : "payment_amount_not_configured" };
      return;
    }

    if (!currency) {
      ctx.status = 409;
      ctx.body = { error: "currency_not_configured" };
      return;
    }

    const amountCents = Math.round(chargeAmount * 100);
    if (!(amountCents > 0)) {
      ctx.status = 409;
      ctx.body = { error: amountSource === "legacy_deposit" ? "deposit_invalid" : "payment_amount_invalid" };
      return;
    }


    // terminal_succeeded_v1: if already succeeded for this booking_request, do NOT create new intents
    // STRICT: treat as terminal only when status=succeeded AND provider evidence says succeeded
    const findSucceededPayment = async () => {
      const row = await strapi.db.connection
        .select(
          "id",
          "provider",
          "provider_intent_id",
          "amount_cents",
          "currency",
          "status",
          "booking_request_id",
          "metadata"
        )
        .from("public.payments")
        .where({ provider: "stripe", booking_request_id: br.id })
        .where("status", "succeeded")
        .andWhere(function () {
          this.whereRaw("(metadata->>\x27provider_status\x27)=\x27succeeded\x27")
            .orWhereRaw("lower(coalesce(metadata->>\x27last_event_type\x27,\x27\x27))=\x27payment_intent.succeeded\x27");
        })
        .orderByRaw("coalesce(updated_at, created_at) desc nulls last, id desc")
        .first();
      return row || null;
    };

    const succ0 = await findSucceededPayment();
    if (succ0) {
      // ensureBooking_terminal_succeeded_v1: link succeeded payment -> booking (idempotent)
      try {
        const hasBookingId = (succ0 as any).booking_id;
        const brId = (succ0 as any).booking_request_id;

        if (!hasBookingId && brId) {
          const knex = strapi.db.connection;
          await knex.transaction(async (trx) => {
            await trx.raw("select pg_advisory_xact_lock(hashtext(?))", ["ensure_booking:" + String(succ0.provider_intent_id)]);

            const rbr = await trx.raw(
              `
              select
                br.id as booking_request_id,
                br.status as br_status,
                br.start_datetime,
                br.end_datetime,
                br.full_name,
                br.phone,
                br.email,
                l.boat_id
              from public.booking_requests br
              join public.booking_requests_boat_lnk l
                on l.booking_request_id = br.id
              where br.id = ?
              limit 1
              `,
              [brId]
            );

            const brRow =
              (rbr &&
                ((rbr.rows && rbr.rows[0]) ||
                  (Array.isArray(rbr[0]) ? rbr[0][0] : rbr[0]))) as any;

            const brSt = String((brRow && ((brRow.br_status !== undefined ? brRow.br_status : brRow.status))) || "").toLowerCase();
            const shouldPendingOwner = allowBeforeOwner && (brSt === "new" || brSt === "pending");
            const boatId = brRow && brRow.boat_id != null ? Number(brRow.boat_id) : null;
            const startDt = brRow ? brRow.start_datetime : null;
            const endDt = brRow ? brRow.end_datetime : null;

            const toIso = (v: any) => {
              try {
                const d = (v instanceof Date) ? v : new Date(v);
                if (!d || isNaN(d.getTime())) return null;
                return d.toISOString();
              } catch {
                return null;
              }
            };

            const startIso = toIso(startDt);
            const endIso = toIso(endDt);

            if (!(boatId && startIso && endIso)) return;

            const depAmount =
              (succ0 as any).amount_cents != null
                ? Number((succ0 as any).amount_cents) / 100.0
                : 0;

            const cur = String((succ0 as any).currency || "EUR");

            const insB = await trx.raw(
              `
              insert into public.bookings
                (boat_id, slot_start_utc, slot_end_utc, status, payment_intent_id, deposit_amount, currency, customer_name, customer_phone, customer_email, created_at)
              values
                (?, (?::timestamptz), (?::timestamptz), (case when (?::boolean) then 'paid_pending_owner'::text else 'deposit_paid'::text end), ?, ?, ?, ?, ?, ?, now())
              on conflict (boat_id, slot_start_utc, slot_end_utc)
                where (status = any (array['hold'::text,'deposit_paid'::text,'paid_pending_owner'::text,'confirmed'::text]))
              do nothing
              returning id
              `,
              [
                boatId,
                String(startIso),
                String(endIso),
                shouldPendingOwner,
                String((succ0 as any).provider_intent_id),
                depAmount,
                cur,
                String(brRow.full_name || ""),
                String(brRow.phone || ""),
                String(brRow.email || ""),
              ]
            );

            let bookingId: any =
              (insB && (insB.rows?.[0]?.id || (Array.isArray(insB[0]) ? insB[0][0]?.id : null))) || null;

            if (!bookingId) {
              const selB = await trx.raw(
                `
                select id, payment_intent_id
              from public.bookings
                where boat_id = ?
                  and slot_start_utc = (?::timestamptz)
                  and slot_end_utc   = (?::timestamptz)
                  and status in ('hold','deposit_paid','paid_pending_owner','confirmed')
                order by id desc
                limit 1
                `,
                [boatId, String(startIso), String(endIso)]
              );

              bookingId =
                (selB && (selB.rows?.[0]?.id || (Array.isArray(selB[0]) ? selB[0][0]?.id : null))) || null;

            const existingB =
              (selB &&
                ((selB.rows && selB.rows[0]) ||
                  (Array.isArray(selB[0]) ? selB[0][0] : null))) as any;

            const existingIntent = existingB && existingB.payment_intent_id != null ? String(existingB.payment_intent_id) : null;
            if (existingIntent && existingIntent !== String((succ0 as any).provider_intent_id)) {
              const e: any = new Error("booking_conflict_other_intent");
              e.code = "booking_conflict_other_intent";
              e.existing_intent_id = existingIntent;
              throw e;
            }

            }

            if (bookingId) {
              await trx.raw(
                `
                update public.payments
                   set booking_id = coalesce(booking_id, ?),
                       updated_at = now()
                 where provider = 'stripe'
                   and provider_intent_id = ?
                `,
                [bookingId, String((succ0 as any).provider_intent_id)]
              );
            }
          });

          // refresh succ0.booking_id for response payload
          const refreshed = await strapi.db.connection
            .select("booking_id")
            .from("public.payments")
            .where({ provider: "stripe", provider_intent_id: (succ0 as any).provider_intent_id })
            .first();
          if (refreshed && (refreshed as any).booking_id) {
            (succ0 as any).booking_id = (refreshed as any).booking_id;
          }
        }
      } catch (_) {
        // best-effort; intent must still return succeeded
      }

      const metaS = (succ0.metadata as any) || {};
      ctx.set("X-Payments-Intent-Impl", "terminal_succeeded_v1");
      ctx.status = 200;
      ctx.body = {
        payment_id: succ0.id,
        provider: succ0.provider,
        provider_intent_id: succ0.provider_intent_id,
        client_secret: metaS.client_secret || null,
        amount_cents: succ0.amount_cents,
        currency: succ0.currency,
        status: succ0.status,
        booking_request_id: succ0.booking_request_id,
      };
      return;
    }

    // single_active_intent_v1: reuse existing active payment for this booking_request (avoid duplicates under concurrency)
    const findActivePayment = async () => {
      const row = await strapi.db.connection
        .select(
          "id",
          "provider",
          "provider_intent_id",
          "amount_cents",
          "currency",
          "status",
          "booking_request_id",
          "metadata"
        )
        .from("public.payments")
        .where({ provider: "stripe", booking_request_id: br.id })
        .whereIn("status", ["created", "processing", "requires_capture", "authorized"])
        .orderByRaw("coalesce(updated_at, created_at) desc nulls last, id desc")
        .first();
      return row || null;
    };

    const active0 = await findActivePayment();
    if (active0) {
      const meta0 = (() => {
        const m: any = (active0 as any).metadata;
        if (!m) return {};
        if (typeof m === "string") {
          try { return JSON.parse(m); } catch { return {}; }
        }
        return m;
      })();
      ctx.set("X-Payments-Intent-Impl", "single_active_intent_v1");
      ctx.status = 200;
      ctx.body = {
        payment_id: active0.id,
        provider: active0.provider,
        provider_intent_id: active0.provider_intent_id,
        client_secret: meta0.client_secret || null,
        amount_cents: active0.amount_cents,
        currency: active0.currency,
        status: active0.status,
        booking_request_id: active0.booking_request_id,
      };
      return;
    }

    if (paymentProvider === "dodo") {
      const cfg = strapi.service("api::payment.payment").getConfig();

      if (!cfg.dodo.apiKey) {
        ctx.status = 503;
        ctx.body = { error: "dodo_api_key_missing" };
        return;
      }

      const dodoBase =
        cfg.dodo.env === "live"
          ? "https://live.dodopayments.com"
          : "https://test.dodopayments.com";

      const dodoProductId = cfg.dodo.productId || "";

      if (!dodoProductId) {
        ctx.status = 503;
        ctx.body = { error: "dodo_product_id_missing" };
        return;
      }

      const checkoutPayload = {
        product_cart: [
          {
            product_id: dodoProductId,
            quantity: 1,
            amount: amountCents,
          },
        ],
        metadata: {
          booking_request_id: String(br.id),
          boat_id: String(boatId),
          public_token: String(br.public_token || publicToken),
          amount_source: amountSource,
          owner_amount: ownerAmount != null && Number.isFinite(ownerAmount) ? String(ownerAmount) : "",
          marketplace_fee_amount: marketplaceFeeAmount != null && Number.isFinite(marketplaceFeeAmount) ? String(marketplaceFeeAmount) : "",
          customer_total_amount: customerTotalAmount != null && Number.isFinite(customerTotalAmount) ? String(customerTotalAmount) : "",
        },
        return_url: cfg.dodo.returnUrl,
        cancel_url: cfg.dodo.cancelUrl,
      };

      const res = await fetch(dodoBase + "/checkouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + cfg.dodo.apiKey,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        ctx.status = 502;
        ctx.body = {
          error: "dodo_checkout_failed",
          status: res.status,
          response: data,
        };
        return;
      }

      const dodoSessionId = String(data.session_id || data.id || "");
      const dodoCheckoutUrl = String(data.checkout_url || data.payment_link || data.url || "");

      if (!dodoSessionId) {
        ctx.status = 502;
        ctx.body = { error: "dodo_session_id_missing", response: data };
        return;
      }

      if (!dodoCheckoutUrl || !dodoCheckoutUrl.startsWith("http")) {
        ctx.status = 502;
        ctx.body = { error: "dodo_checkout_url_missing", response: data };
        return;
      }

      const dodoMetadata = {
        provider_status: "checkout_created",
        session_id: dodoSessionId,
        checkout_url: dodoCheckoutUrl,
        booking_request_id: String(br.id),
        boat_id: String(boatId),
        public_token: String(br.public_token || publicToken),
        amount_source: amountSource,
        owner_amount: ownerAmount != null && Number.isFinite(ownerAmount) ? String(ownerAmount) : "",
        marketplace_fee_amount: marketplaceFeeAmount != null && Number.isFinite(marketplaceFeeAmount) ? String(marketplaceFeeAmount) : "",
        customer_total_amount: customerTotalAmount != null && Number.isFinite(customerTotalAmount) ? String(customerTotalAmount) : "",
      };

      const insertedDodo = await strapi.db.connection.raw(
        `
        insert into public.payments
          (provider, provider_intent_id, amount_cents, currency, status, booking_request_id, metadata, idempotency_key, created_at, updated_at)
        values
          (?, ?, ?, ?, ?, ?, ?::jsonb, ?, now(), now())
        on conflict (idempotency_key) where idempotency_key is not null
        do update set
          provider_intent_id = excluded.provider_intent_id,
          amount_cents = excluded.amount_cents,
          currency = excluded.currency,
          status = excluded.status,
          booking_request_id = excluded.booking_request_id,
          metadata = public.payments.metadata || excluded.metadata,
          updated_at = now()
        returning id, provider, provider_intent_id, amount_cents, currency, status, booking_request_id, metadata
        `,
        [
          "dodo",
          dodoSessionId,
          amountCents,
          currency.toLowerCase(),
          "pending",
          br.id,
          JSON.stringify(dodoMetadata),
          idk,
        ]
      );

      const dodoPayment = insertedDodo?.rows?.[0] || null;

      ctx.status = 200;
      ctx.body = {
        payment_id: dodoPayment?.id || null,
        provider: "dodo",
        provider_intent_id: dodoSessionId,
        session_id: dodoSessionId,
        checkout_url: dodoCheckoutUrl,
        amount_cents: amountCents,
        currency: currency.toLowerCase(),
        status: "pending",
        booking_request_id: br.id,
      };

      return;
    }


    const stripe = strapi.service("api::payment.payment").getStripeClient();

    const pi = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: currency.toLowerCase(),
        capture_method: "manual",
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        metadata: {
          booking_request_id: String(br.id),
          boat_id: String(boatId),
          public_token: String(br.public_token || publicToken),
          amount_source: amountSource,
          owner_amount: ownerAmount != null && Number.isFinite(ownerAmount) ? String(ownerAmount) : "",
          marketplace_fee_amount: marketplaceFeeAmount != null && Number.isFinite(marketplaceFeeAmount) ? String(marketplaceFeeAmount) : "",
          customer_total_amount: customerTotalAmount != null && Number.isFinite(customerTotalAmount) ? String(customerTotalAmount) : "",
        },
      },
      { idempotencyKey: idk }
    );

    const metadata = {
      provider_status: pi.status,
      client_secret: pi.client_secret || null,
      public_token: br.public_token || publicToken,
      boat_id: boatId,
      amount_source: amountSource,
      owner_amount: ownerAmount != null && Number.isFinite(ownerAmount) ? ownerAmount : null,
      marketplace_fee_amount: marketplaceFeeAmount != null && Number.isFinite(marketplaceFeeAmount) ? marketplaceFeeAmount : null,
      customer_total_amount: customerTotalAmount != null && Number.isFinite(customerTotalAmount) ? customerTotalAmount : null,
    };

    let paymentId: any = null;

    try {
    const ins = await strapi.db.connection.raw(
      `
      insert into public.payments
        (provider, provider_intent_id, amount_cents, currency, status, booking_request_id, metadata, idempotency_key, created_at, updated_at)
      values
        (?, ?, ?, ?, 'created'::text, ?, ?::jsonb, ?, now(), now())
      on conflict (idempotency_key) where idempotency_key is not null
      do update set
        provider_intent_id = excluded.provider_intent_id,
        amount_cents = excluded.amount_cents,
        currency = excluded.currency,
        status = excluded.status,
        booking_request_id = excluded.booking_request_id,
        metadata = excluded.metadata,
        updated_at = now()
      returning id
      `,
      [
        "stripe",
        pi.id,
        amountCents,
        currency.toUpperCase(),
        br.id,
        JSON.stringify(metadata),
        idk,
      ]
    );



      paymentId =
        (ins && (ins.rows?.[0]?.id || (Array.isArray(ins[0]) ? ins[0][0]?.id : null))) || null;
    } catch (e) {
      const err: any = e as any;

      // Race-safe: unique partial index on active stripe payments per booking_request
      if (err && (err.code === "23505" || String(err.constraint || "").includes("payments_one_active_per_booking_request_stripe"))) {
        // best-effort: cancel freshly created intent to avoid orphans (not fatal if fails)
        try { await stripe.paymentIntents.cancel(pi.id); } catch (_) {}

        const active1 = await findActivePayment();
        if (active1) {
          const meta1 = (active1.metadata as any) || {};
          ctx.set("X-Payments-Intent-Impl", "single_active_intent_v1");
          ctx.status = 200;
          ctx.body = {
            payment_id: active1.id,
            provider: active1.provider,
            provider_intent_id: active1.provider_intent_id,
            client_secret: meta1.client_secret || null,
            amount_cents: active1.amount_cents,
            currency: active1.currency,
            status: active1.status,
            booking_request_id: active1.booking_request_id,
          };
          return;
        }
      }

      throw e;
    }

    ctx.status = 200;
    ctx.body = {
      payment_id: paymentId,
      provider: "stripe",
      provider_intent_id: pi.id,
      client_secret: pi.client_secret || null,
      amount_cents: amountCents,
      currency: currency.toUpperCase(),
      status: "created",
      booking_request_id: br.id,
    };
  },

  async webhook(ctx) {
        const cfg = strapi.config.get("payments") as any;
        if (!(cfg && cfg.enabled)) {
            ctx.status = 503;
            ctx.body = { error: "payments_disabled" };
            return;
        }
        if (!cfg.stripe || !cfg.stripe.secretKey) {
            ctx.status = 503;
            ctx.body = { error: "stripe_secret_key_missing" };
            return;
        }
        if (!cfg.stripe.webhookSecret) {
            ctx.status = 503;
            ctx.body = { error: "stripe_webhook_secret_missing" };
            return;
        }

        const h_req = (ctx.req && ctx.req.headers) ? ctx.req.headers : {};

        const stripeSig = String(
          h_req["stripe-signature"] || h_req["Stripe-Signature"] || ""
        ).trim();

        const dodoSig = String(
          h_req["x-dodo-signature"] ||
          h_req["X-Dodo-Signature"] ||
          h_req["dodo-signature"] ||
          ""
        ).trim();

        const isStripeWebhook = !!stripeSig;
        const isDodoWebhook = !!dodoSig;

        if (!isStripeWebhook && !isDodoWebhook) {
            ctx.status = 400;
            ctx.body = { error: "webhook_signature_missing" };
            return;
        }

        const sym = Symbol.for("unparsedBody");
        const b = (ctx.request && ctx.request.body) ? ctx.request.body : null;
        const raw1 = (b && b[sym]) ? b[sym] : null;
        const raw2 = (ctx.request && ctx.request.rawBody) ? ctx.request.rawBody : null;
        const raw3 = (ctx.req && ctx.req.rawBody) ? ctx.req.rawBody : null;
        const raw4 = (ctx.req && (typeof (ctx.req as any).body === "string" || Buffer.isBuffer((ctx.req as any).body))) ? (ctx.req as any).body : null;
        const raw5 = (typeof b === "string" || Buffer.isBuffer(b)) ? b : null;
        const raw = raw1 || raw2 || raw3 || raw4 || raw5;
        if (!raw) {
            ctx.status = 500;
            ctx.body = {
              error: "raw_body_missing",
              probe: {
                body_type: (b === null ? "null" : (Buffer.isBuffer(b) ? "buffer" : typeof b)),
                has_unparsedBody: !!(b && b[sym]),
                has_request_rawBody: !!(ctx.request && ctx.request.rawBody),
                has_req_rawBody: !!(ctx.req && ctx.req.rawBody),
                has_req_body: !!(ctx.req && ctx.req.body),
                has_body_as_string_or_buffer: !!raw5
              }
            };
            return;
        }


        if (isDodoWebhook) {
          let dodoEvent: any = null;

          try {
            const rawText = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
            dodoEvent = JSON.parse(rawText);
          } catch (e) {
            ctx.status = 400;
            ctx.body = { error: "dodo_payload_invalid_json" };
            return;
          }

          const dodoEventType = String(
            dodoEvent?.type ||
            dodoEvent?.event_type ||
            dodoEvent?.event ||
            ""
          );

          const dodoData = dodoEvent?.data || dodoEvent?.payload || dodoEvent?.object || dodoEvent || {};

          const dodoSessionId = String(
            dodoData?.session_id ||
            dodoData?.checkout_session_id ||
            dodoData?.checkout_id ||
            dodoEvent?.session_id ||
            ""
          );

          const dodoPaymentId = String(
            dodoData?.payment_id ||
            dodoData?.id ||
            dodoEvent?.payment_id ||
            ""
          );

          const dodoStatus = String(
            dodoData?.status ||
            dodoEvent?.status ||
            ""
          );

          ctx.status = 200;
          ctx.body = {
            ok: true,
            provider: "dodo",
            mode: "diagnostic_only",
            event_type: dodoEventType,
            session_id: dodoSessionId || null,
            payment_id: dodoPaymentId || null,
            status: dodoStatus || null,
          };
          return;
        }

        const Stripe = require("stripe");
        const stripe = new Stripe(cfg.stripe.secretKey);
        let event;
        try {
            event = stripe.webhooks.constructEvent(raw, stripeSig, cfg.stripe.webhookSecret);
        } catch (e) {
            ctx.status = 400;
            ctx.body = { error: "stripe_signature_invalid" };
            return;
        }

        const eventId = String((event && event.id) || "");
        if (!eventId) {
            ctx.status = 200;
            ctx.body = { ok: true, ignored: true, reason: "missing_event_id" };
            return;
        }

        const insEvt = await strapi.db.connection.raw(
          "insert into public.stripe_events (event_id, event_type, provider_intent_id, created_utc, payload) values (?, ?, ?, to_timestamp(?), ?::jsonb) on conflict (event_id) do nothing returning id",
          [eventId, String(event.type || ""), String(((event.data && event.data.object && event.data.object.id) || "")), Number(event.created || 0), JSON.stringify(event)]
        );
        const insEvtId = (insEvt && (insEvt.rows?.[0]?.id || (Array.isArray(insEvt[0]) ? insEvt[0][0]?.id : null))) || null;
        if (!insEvtId) {
            ctx.status = 200;
            ctx.body = { ok: true, replay: true, event_id: eventId, type: String(event.type || "") };
            return;
        }


        const t = String(event && event.type || "");
        const obj = event && event.data && event.data.object ? event.data.object : {};
        const intentId = String(obj.id || "");
        const providerStatus = String(obj.status || "");
        if (!intentId) {
            ctx.status = 200;
            ctx.body = { ok: true, ignored: true };
            return;
        }

        let newStatus = null;
        if (t === "payment_intent.amount_capturable_updated") newStatus = "authorized";
        else if (t === "payment_intent.succeeded") newStatus = "succeeded";
        else if (t === "payment_intent.payment_failed") newStatus = "failed";

        if (!newStatus) {
            ctx.status = 200;
            ctx.body = { ok: true, ignored: true, type: t };
            return;
        }

                const rank: Record<string, number> = {
          created: 10,
          processing: 50,
          authorized: 70,
          canceled: 80,
          failed: 90,
          succeeded: 100,
        };

        const cur0 = await strapi.db.connection.raw(
          "select status from public.payments where provider = 'stripe' and provider_intent_id = ? limit 1",
          [intentId]
        );
        const currentStatus = String((cur0 && (cur0.rows?.[0]?.status || (Array.isArray(cur0[0]) ? cur0[0][0]?.status : ""))) || "").trim();

        const curRank = rank[currentStatus] ?? 0;
        const newRank = rank[String(newStatus || "")] ?? 0;

        if (newRank >= curRank) {
await strapi.db.connection.raw(
  `update public.payments
     set status = ?,
         metadata = coalesce(metadata, '{}'::jsonb) || ?::jsonb,
         updated_at = now()
   where provider = 'stripe' and provider_intent_id = ?`,
  [newStatus, JSON.stringify({ provider_status: providerStatus, last_event_type: t }), intentId]
);

// ADR-0001 enforcement (hybrid):
// - if payment succeeded AND PAYMENTS_ALLOW_BEFORE_OWNER_APPROVAL=true AND BR status in (new,pending)
//   -> set paid_pending_owner
// - else -> confirmed
const allowBeforeOwner = String(process.env.PAYMENTS_ALLOW_BEFORE_OWNER_APPROVAL || "").toLowerCase() === "true";
const desiredBrStatus = (newStatus === "succeeded") ? "succeeded" : null;

if (desiredBrStatus) {
// webhook-first: ensure booking exists + link payment->booking_id (idempotent, atomic via CTE)
try {
  await strapi.db.connection.raw(
    `
    with p as (
      select
        booking_request_id,
        provider_intent_id,
        currency,
        amount_cents
      from public.payments
      where provider = 'stripe' and provider_intent_id = ?
      limit 1
    ),
    br as (
      select
        br.id as booking_request_id,
        br.status as br_status,
        br.start_datetime,
        br.end_datetime,
        br.full_name,
        br.phone,
        br.email,
        l.boat_id
      from public.booking_requests br
      join public.booking_requests_boat_lnk l
        on l.booking_request_id = br.id
      where br.id = (select booking_request_id from p)
      limit 1
    ),
    ins as (
      insert into public.bookings
        (boat_id, slot_start_utc, slot_end_utc, status, payment_intent_id, deposit_amount, currency, customer_name, customer_phone, customer_email, created_at)
      select
        br.boat_id,
        (br.start_datetime::timestamptz),
        (br.end_datetime::timestamptz),
        (case
           when (?::boolean) and lower(coalesce(br.br_status,'')) in ('new','pending') then 'paid_pending_owner'::text
           else 'deposit_paid'::text
         end),
        p.provider_intent_id,
        (coalesce(p.amount_cents, 0)::numeric / 100.0),
        coalesce(nullif(p.currency,''),'EUR'),
        coalesce(br.full_name,''),
        coalesce(br.phone,''),
        coalesce(br.email,''),
        now()
      from br
      join p on true
      where br.boat_id is not null
        and br.start_datetime is not null
        and br.end_datetime is not null
      on conflict (boat_id, slot_start_utc, slot_end_utc)
        where (status = any (array['hold'::text,'deposit_paid'::text,'paid_pending_owner'::text,'confirmed'::text]))
      do nothing
      returning id
    ),
    b as (
      select id from ins
      union all
      select bk.id
      from public.bookings bk
      join br on bk.boat_id = br.boat_id
      where bk.slot_start_utc = (br.start_datetime::timestamptz)
        and bk.slot_end_utc   = (br.end_datetime::timestamptz)
        and bk.status in ('hold','deposit_paid','paid_pending_owner','confirmed')
      order by id desc
      limit 1
    )
    update public.payments
       set booking_id = coalesce(booking_id, (select id from b)),
           updated_at = now()
     where provider = 'stripe'
       and provider_intent_id = ?
    `,
    [intentId, allowBeforeOwner, intentId]
  );
} catch (e) {
  const code = String((e as any)?.code || "");
  const constraint = String((e as any)?.constraint || "");
  if (code === "23505" && constraint === "payments_uq_booking_stripe_succeeded") {
    // dedupe_23505_fallthrough_v1: do NOT throw; continue to booking_request sync below
  } else {
    throw e;
  }
}

await strapi.db.connection.raw(
  `update public.booking_requests
     set status = case
                    when (?::boolean)
                     and lower(coalesce(status,'')) in ('new','pending')
                    then 'paid_pending_owner'
                    else 'confirmed'
                  end,
         updated_at = now(),
         decided_at = case
                       when (not ((?::boolean) and lower(coalesce(status,'')) in ('new','pending')))
                        and decided_at is null
                       then now()
                       else decided_at
                     end
   where id = (
     select booking_request_id
       from public.payments
      where provider = 'stripe' and provider_intent_id = ?
      limit 1
   )
     and status is distinct from 'confirmed' and lower(coalesce(status,'')) <> 'declined' and exists (select 1 from public.payments p2 where p2.provider = 'stripe' and p2.provider_intent_id = ? and p2.status = 'succeeded')`,
  [allowBeforeOwner, allowBeforeOwner, intentId, intentId]
);
}

        }
        // else: ignore out-of-order downgrade

ctx.status = 200;
ctx.body = { ok: true, type: t, provider_intent_id: intentId, provider_status: providerStatus, status: newStatus };

    },

    async capture(ctx) {
    const cfg = strapi.config.get("payments") as any;
    if (!cfg?.enabled) {
      ctx.status = 503;
      ctx.body = { error: "payments_disabled" };
      return;
    }

    const expected = String(cfg?.adminToken || "");
    if (!expected) {
      ctx.status = 503;
      ctx.body = { error: "payments_admin_token_missing" };
      return;
    }

    const provided = String(
      (ctx.request && ctx.request.header && (ctx.request.header["x-admin-token"] || ctx.request.header["X-Admin-Token"])) || ""
    );
    if (!provided || provided !== expected) {
      ctx.status = 401;
      ctx.body = { error: "payments_admin_unauthorized" };
      return;
    }

    const idk = String(
      ctx.request.headers["idempotency-key"] ||
        ctx.request.headers["x-idempotency-key"] ||
        ""
    ).trim();
    if (!idk) {
      ctx.status = 400;
      ctx.body = { error: "idempotency_key_required" };
      return;
    }

    const intentId = String(
      (ctx.request.body &&
        (ctx.request.body.provider_intent_id ||
          ctx.request.body.providerIntentId ||
          ctx.request.body.intent_id ||
          ctx.request.body.intentId)) ||
        ""
    ).trim();
    if (!intentId) {
      ctx.status = 400;
      ctx.body = { error: "provider_intent_id_required" };
      return;
    }

    const stripe = strapi.service("api::payment.payment").getStripeClient();
    const knex = strapi.db.connection;

    try {
      await knex.transaction(async (trx) => {
        await trx.raw("select pg_advisory_xact_lock(hashtext(?))", [String(intentId)]);

        const payment = await trx
          .select("id", "status", "booking_request_id", "currency", "amount_cents", "booking_id")
          .from("public.payments")
          .where({ provider: "stripe", provider_intent_id: intentId })
          .first()
          .forUpdate();

        if (!payment) {
          ctx.status = 404;
          ctx.body = { error: "payment_not_found", provider_intent_id: intentId };
          return;
        }

        
        // Sync provider status from Stripe so DB can progress to requires_capture.
        // This avoids relying on webhook coverage for intermediate states.
        let pi0;
        try {
          pi0 = await stripe.paymentIntents.retrieve(intentId);
        } catch (e) {
          ctx.status = 502;
          ctx.body = { error: "stripe_retrieve_failed", provider_intent_id: intentId, message: String((e && e.message) || "unknown") };
          return;
        }

        const providerStatus0 = String((pi0 && pi0.status) || "");

        // recovery_v1: if provider already reached terminal state, sync DB to avoid 409 after partial failures
        const mapProviderToDbStatus = (ps: string) => {
          if (ps === "succeeded") return "succeeded";
          if (ps === "canceled") return "canceled";
          return null;
        };

        // capture_terminal_guard_v1
        const rankCapture: Record<string, number> = {
          created: 10,
          processing: 50,
          requires_capture: 70,
          authorized: 80,
          canceled: 90,
          failed: 95,
          succeeded: 100,
        };

        const curSt0 = String((payment && (payment as any).status) || "").toLowerCase();
        const terminal0 = mapProviderToDbStatus(providerStatus0);

        if (terminal0) {
          const curRank0 = rankCapture[curSt0] ?? 0;
          const newRank0 = rankCapture[String(terminal0 || "")] ?? 0;

          if (newRank0 >= curRank0) {
            await trx.raw(
              "update public.payments set status = ?, updated_at = now() where provider = 'stripe' and provider_intent_id = ? and status not in ('succeeded','canceled')",
              [terminal0, intentId]
            );
          }
        }

await trx.raw(
          "update public.payments set metadata = coalesce(metadata, '{}'::jsonb) || ?::jsonb, updated_at = now() where provider = 'stripe' and provider_intent_id = ?",
          [JSON.stringify({ provider_status: providerStatus0, last_action: "capture_sync_status" }), intentId]
        );

        // If Stripe already moved to requires_capture, reflect it in DB so capture is allowed.
        const dbSt0 = String(payment.status || "").toLowerCase();
        if (providerStatus0 === "requires_capture" && dbSt0 !== "requires_capture") {
          await trx.raw(
            "update public.payments set status = 'requires_capture', updated_at = now() where provider = 'stripe' and provider_intent_id = ? and status not in ('succeeded','canceled')",
            [intentId]
          );
        }

        const st =
          (providerStatus0 === "succeeded") ? "succeeded" :
          (providerStatus0 === "requires_capture") ? "requires_capture" :
          (providerStatus0 === "canceled") ? "canceled" :
          dbSt0;

        // ensureBookingV1: create booking + link payment->booking (covers idempotent succeeded path too)
        const ensureBookingV1 = async () => {
        const allowBeforeOwner = String(process.env.PAYMENTS_ALLOW_BEFORE_OWNER_APPROVAL || "").toLowerCase() === "true";


          if (payment && (payment as any).booking_id) return;

          const brId = payment ? (payment as any).booking_request_id : null;
          if (!brId) return;

          const rbr = await trx.raw(
            `
            select
              br.id as booking_request_id,
                br.status as br_status,
              br.start_datetime,
              br.end_datetime,
              br.full_name,
              br.phone,
              br.email,
              l.boat_id
            from public.booking_requests br
            join public.booking_requests_boat_lnk l
              on l.booking_request_id = br.id
            where br.id = ?
            limit 1
            `,
            [brId]
          );

          const brRow =
            (rbr &&
              ((rbr.rows && rbr.rows[0]) ||
                (Array.isArray(rbr[0]) ? rbr[0][0] : rbr[0]))) as any;

          const brSt = String((brRow && ((brRow.br_status !== undefined ? brRow.br_status : brRow.status))) || "").toLowerCase();
            const shouldPendingOwner = allowBeforeOwner && (brSt === "new" || brSt === "pending");
            const boatId = brRow && brRow.boat_id != null ? Number(brRow.boat_id) : null;
          const startDt = brRow ? brRow.start_datetime : null;
          const endDt = brRow ? brRow.end_datetime : null;

          const toIso = (v: any) => {
            try {
              const d = (v instanceof Date) ? v : new Date(v);
              if (!d || isNaN(d.getTime())) return null;
              return d.toISOString();
            } catch {
              return null;
            }
          };

          const startIso = toIso(startDt);
          const endIso = toIso(endDt);

          if (!(boatId && startIso && endIso)) return;

          const depAmount =
            payment && (payment as any).amount_cents != null
              ? Number((payment as any).amount_cents) / 100.0
              : Number(((pi0 as any).amount || 0)) / 100.0;

          const cur = String((payment && (payment as any).currency) || "EUR");

          const insB = await trx.raw(
            `
            insert into public.bookings
              (boat_id, slot_start_utc, slot_end_utc, status, payment_intent_id, deposit_amount, currency, customer_name, customer_phone, customer_email, created_at)
            values
              (?, (?::timestamptz), (?::timestamptz), (case when (?::boolean) then 'paid_pending_owner'::text else 'deposit_paid'::text end), ?, ?, ?, ?, ?, ?, now())
            on conflict (boat_id, slot_start_utc, slot_end_utc)
              where (status = any (array['hold'::text,'deposit_paid'::text,'paid_pending_owner'::text,'confirmed'::text]))
            do nothing
            returning id
            `,
            [
              boatId,
              String(startIso),
              String(endIso),
              shouldPendingOwner,
              intentId,
              depAmount,
              cur,
              String(brRow.full_name || ""),
              String(brRow.phone || ""),
              String(brRow.email || ""),
            ]
          );

          let bookingId: any =
            (insB && (insB.rows?.[0]?.id || (Array.isArray(insB[0]) ? insB[0][0]?.id : null))) || null;

          if (!bookingId) {
            const selB = await trx.raw(
              `
              select id
              from public.bookings
              where boat_id = ?
                and slot_start_utc = (?::timestamptz)
                and slot_end_utc   = (?::timestamptz)
                and status in ('hold','deposit_paid','paid_pending_owner','confirmed')
              order by id desc
              limit 1
              `,
              [boatId, String(startIso), String(endIso)]
            );

            bookingId =
              (selB && (selB.rows?.[0]?.id || (Array.isArray(selB[0]) ? selB[0][0]?.id : null))) || null;
          }

          if (bookingId) {
            await trx.raw(
              `
              update public.payments
                 set booking_id = coalesce(booking_id, ?),
                     updated_at = now()
               where provider = 'stripe'
                 and provider_intent_id = ?
              `,
              [bookingId, intentId]
            );

            await trx.raw(
              `
              update public.booking_requests
                 set status = case
                                when (?::boolean)
                                 and lower(coalesce(status,'')) in ('new','pending')
                                then 'paid_pending_owner'
                                else 'confirmed'
                              end,
                     updated_at = now(),
                     decided_at = case
                                   when (not ((?::boolean) and lower(coalesce(status,'')) in ('new','pending')))
                                    and decided_at is null
                                   then now()
                                   else decided_at
                                 end
               where id = ?
                 and status is distinct from 'confirmed'
                 and exists (
                   select 1 from public.payments p2
                   where p2.provider = 'stripe'
                     and p2.provider_intent_id = ?
                     and p2.status = 'succeeded'
                 )
              `,
              [allowBeforeOwner, allowBeforeOwner, brId, intentId]
            );
          }
        };


        if (st === "succeeded") {
          // webhook-first: booking/BR finalization is done by webhook (or reconcile), not by capture()
          ctx.status = 200;
          ctx.body = {
            ok: true,
            idempotent: true,
            provider_intent_id: intentId,
            status: "succeeded",
            payment_id: payment.id,
            booking_request_id: payment.booking_request_id || null,
            finalization: "webhook",
          };
          return;
        }

        if (st !== "requires_capture" && st !== "processing") {
          ctx.status = 409;
          ctx.body = { error: "payment_not_capturable", status: payment.status, provider_intent_id: intentId };
          return;
        }

        await trx.raw(
          "update public.payments set status = 'processing', metadata = coalesce(metadata, '{}'::jsonb) || ?::jsonb, updated_at = now() where provider = 'stripe' and provider_intent_id = ? and status not in ('succeeded','canceled')",
          [
            JSON.stringify({
              capture_requested_at: new Date().toISOString(),
              capture_idempotency_key: idk,
              last_action: "capture_api",
            }),
            intentId,
          ]
        );

        let pi;
        try {
          pi = await stripe.paymentIntents.capture(intentId, {}, { idempotencyKey: "capture:" + intentId + ":" + idk });
        } catch (e) {
          const msg = String((e && (e.message || (e.raw && e.raw.message))) || "").toLowerCase();
          const code = String((e && (e.code || (e.raw && e.raw.code))) || "").toLowerCase();
          const maybeAlready = msg.includes("already") || code.includes("payment_intent_unexpected_state");
          if (maybeAlready) {
            pi = await stripe.paymentIntents.retrieve(intentId);
          } else {
            throw e;
          }
        }

        const providerStatus = String((pi && pi.status) || "");

        // capture must not downgrade status to 'failed' (webhook is the source of truth for terminal failures)
        if (providerStatus === "requires_payment_method" || providerStatus === "payment_failed") {
          await trx.raw(
            "update public.payments set metadata = coalesce(metadata, '{}'::jsonb) || ?::jsonb, updated_at = now() where provider = 'stripe' and provider_intent_id = ?",
            [
              JSON.stringify({
                provider_status: providerStatus,
                capture_completed_at: new Date().toISOString(),
                last_action: "capture_api_not_capturable",
              }),
              intentId,
            ]
          );

          ctx.status = 409;
          ctx.body = {
            error: "payment_not_capturable_provider_state",
            provider_intent_id: intentId,
            provider_status: providerStatus,
          };
          return;
        }

        let newStatus = "processing";
                if (providerStatus === "canceled") newStatus = "canceled";

        await trx.raw(
          "update public.payments set status = ?, metadata = coalesce(metadata, '{}'::jsonb) || ?::jsonb, updated_at = now() where provider = 'stripe' and provider_intent_id = ? and status not in ('succeeded','canceled')",
          [
            newStatus,
            JSON.stringify({
              provider_status: providerStatus,
              capture_completed_at: new Date().toISOString(),
              last_action: "capture_api_done",
            }),
            intentId,
          ]
        );



        ctx.status = 200;
        ctx.body = {
          ok: true,
          provider_intent_id: intentId,
          provider_status: providerStatus,
          status: newStatus,
          payment_id: payment.id,
          booking_request_id: payment.booking_request_id || null,
        };
      });
    } catch (e) {
      ctx.status = 502;
      ctx.body = {
        error: "stripe_capture_failed",
        provider_intent_id: intentId,
        message: String((e && e.message) || "unknown"),
      };
      return;
    }
  },
};
