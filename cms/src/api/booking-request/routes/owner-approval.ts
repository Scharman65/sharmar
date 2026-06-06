export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/booking-requests/:token/status",
      handler: "booking-request.statusByToken",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/booking-requests/:token/owner-confirm",
      handler: "booking-request.ownerConfirm",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/booking-requests/:token/owner-decline",
      handler: "booking-request.ownerDecline",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/booking-requests/:token/owner-refund",
      handler: "booking-request.ownerRefund",
      config: {
        auth: false,
      },
    },
  ],
};
