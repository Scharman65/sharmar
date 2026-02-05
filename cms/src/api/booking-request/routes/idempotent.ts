export default {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/booking-requests-idempotent",
      handler: "booking-request.idempotentCreate",
      config: {
        auth: false,
      },
    },
  ],
};
