export default {
  routes: [
    {
      method: "GET",
      path: "/admin-dashboard/summary",
      handler: "admin-dashboard.summary",
      config: {
        auth: false,
      },
    },
  ],
};
