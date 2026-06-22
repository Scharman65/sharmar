import Stripe from "stripe";

function getRawBody(ctx: any): Buffer | null {
  const b = ctx?.request?.body;
  if (b && typeof b === "object") {
    const sym = Symbol.for("unparsedBody");
    const raw = (b as any)[sym];
    if (Buffer.isBuffer(raw)) return raw;
    if (typeof raw === "string") return Buffer.from(raw, "utf8");
  }

  const rawBody = (ctx?.request as any)?.rawBody;
  if (Buffer.isBuffer(rawBody)) return rawBody;
  if (typeof rawBody === "string") return Buffer.from(rawBody, "utf8");

  return null;
}

function extractProviderIntentId(evt: any): string | null {
  const obj = evt?.data?.object;
  if (!obj) return null;

  if (obj.object === "payment_intent" && typeof obj.id === "string") return obj.id;

  if (typeof obj.payment_intent === "string") return obj.payment_intent;
  if (typeof obj.payment_intent?.id === "string") return obj.payment_intent.id;

  if (typeof obj?.id === "string" && typeof obj?.object === "string" && obj.object.includes("payment_intent")) {
    return obj.id;
  }

  return null;
}

export default {
  async webhook(ctx: any) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      strapi.log.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is missing");
      ctx.status = 500;
      ctx.body = { ok: false };
      return;
    }

    const sig = ctx.request.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      ctx.status = 400;
      ctx.body = { ok: false };
      return;
    }

    const raw = getRawBody(ctx);
    if (!raw) {
      strapi.log.error("[stripe-webhook] unparsed body is missing (includeUnparsed must be true)");
      ctx.status = 400;
      ctx.body = { ok: false };
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-02-24.acacia" });
      event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
    } catch (e: any) {
      strapi.log.warn(`[stripe-webhook] signature verification failed: ${e?.message || e}`);
      ctx.status = 400;
      ctx.body = { ok: false };
      return;
    }

    const providerIntentId = extractProviderIntentId(event);
    const createdUtc = typeof (event as any).created === "number" ? new Date((event as any).created * 1000) : null;

    try {
      await strapi.db.connection("stripe_events")
        .insert({
          event_id: event.id,
          event_type: event.type,
          provider_intent_id: providerIntentId,
          created_utc: createdUtc,
          payload: event as any,
        })
        .onConflict("event_id")
        .ignore();
    } catch (e: any) {
      strapi.log.error(`[stripe-webhook] db insert failed: ${e?.message || e}`);
      ctx.status = 500;
      ctx.body = { ok: false };
      return;
    }

    ctx.status = 200;
    ctx.body = { ok: true };
  },
};
