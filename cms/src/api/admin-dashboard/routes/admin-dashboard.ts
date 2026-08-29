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
    {
      method: "GET",
      path: "/admin-dashboard/marketplace-analytics",
      handler: "admin-dashboard.marketplaceAnalytics",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/admin-dashboard/moderation-events",
      handler: "admin-dashboard.moderationEvents",
      config: {
        auth: false,
      },
    },
    {
      method: "PATCH",
      path: "/admin-dashboard/booking-requests/:id/external-refund",
      handler: "admin-dashboard.updateExternalRefund",
      config: {
        auth: false,
      },
    },
  ],
};
