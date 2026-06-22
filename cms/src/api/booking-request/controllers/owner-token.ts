import crypto from "crypto";

export default {
  async ownerToken(ctx) {
    const { id } = ctx.params;

    if (!id) {
      ctx.badRequest("Missing booking-request id");
      return;
    }

    const ownerToken = crypto.randomBytes(24).toString("hex");

    ctx.status = 200;
    ctx.body = { owner_token: ownerToken };
  },
};
