export default {
  routes: [
    {
      method: "POST",
      path: "/owner/rate-limit/check",
      handler: "owner-rate-limit.check",
      config: { auth: false },
    },
  ],
};
