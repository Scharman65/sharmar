import Stripe from "stripe";

type PaymentsConfig = {
  enabled: boolean;
  provider: string;
  stripe: {
    mode: string;
    secretKey: string;
    webhookSecret: string;
  };
  dodo: {
    env: string;
    apiKey: string;
    webhookSecret: string;
    returnUrl: string;
    cancelUrl: string;
    productId: string;
  };
};

export default () => ({
  getConfig(): PaymentsConfig {
    const cfg = strapi.config.get("payments") as any;
    return {
      enabled: !!cfg?.enabled,
      provider: String(cfg?.provider || "stripe"),
      stripe: {
        mode: String(cfg?.stripe?.mode || "test"),
        secretKey: String(cfg?.stripe?.secretKey || ""),
        webhookSecret: String(cfg?.stripe?.webhookSecret || ""),
      },
      dodo: {
        env: String(cfg?.dodo?.env || "test"),
        apiKey: String(cfg?.dodo?.apiKey || ""),
        webhookSecret: String(cfg?.dodo?.webhookSecret || ""),
        returnUrl: String(cfg?.dodo?.returnUrl || ""),
        cancelUrl: String(cfg?.dodo?.cancelUrl || ""),
        productId: String(cfg?.dodo?.productId || ""),
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
