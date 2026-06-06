export default ({ env }) => ({
  enabled: env.bool("PAYMENTS_ENABLED", false),
  adminToken: env("PAYMENTS_ADMIN_TOKEN", ""),
  provider: env("PAYMENT_PROVIDER", "stripe"),
  stripe: {
    mode: env("STRIPE_MODE", "test"),
    secretKey: env("STRIPE_SECRET_KEY", ""),
    webhookSecret: env("STRIPE_WEBHOOK_SECRET", ""),
  },
});
