export default {
  routes: [
    {
      method: "POST",
      path: "/internal/notification-deliveries/claim",
      handler: "notification-delivery.claim",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/internal/notification-deliveries/record",
      handler: "notification-delivery.record",
      config: { auth: false },
    },
  ],
};
