import Stripe from "stripe";

type PaymentsConfig = {
  enabled: boolean;
  stripe: {
    mode: string;
    secretKey: string;
    webhookSecret: string;
  };
};

export default () => ({
  getConfig(): PaymentsConfig {
    const cfg = strapi.config.get("payments") as any;
    return {
      enabled: !!cfg?.enabled,
      stripe: {
        mode: String(cfg?.stripe?.mode || "test"),
        secretKey: String(cfg?.stripe?.secretKey || ""),
        webhookSecret: String(cfg?.stripe?.webhookSecret || ""),
      },
    };
  },

  getStripeClient() {
    const cfg = this.getConfig();
    if (!cfg.stripe.secretKey) {
      throw new Error("stripe_secret_key_missing");
    }
    return new Stripe(cfg.stripe.secretKey);
  },
});
