export default {
  routes: [
    {
      method: 'GET',
      path: '/payments/health',
      handler: 'payment.health',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/payments/intent',
      handler: 'payment.createIntent',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/payments/webhook',
      handler: 'payment.webhook',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/payments/capture',
      handler: 'payment.capture',
      config: { auth: false },
    },
  ],
};
