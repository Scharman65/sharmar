export default {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/request",
      handler: "booking-request.requestCreate",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/request/:token/approve",
      handler: "booking-request.requestApprove",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/request/:token/decline",
      handler: "booking-request.requestDecline",
      config: {
        auth: false,
      },
    },
  ],
};
