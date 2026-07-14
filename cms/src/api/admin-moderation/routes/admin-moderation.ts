export default {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/admin-moderation/action",
      handler: "admin-moderation.action",
      config: {
        auth: false,
      },
    },
  ],
};
