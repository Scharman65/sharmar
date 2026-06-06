export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/booking-request-status/:token",
      handler: "booking-request.statusByToken",
      config: {
        auth: false,
      },
    },
  ],
};
