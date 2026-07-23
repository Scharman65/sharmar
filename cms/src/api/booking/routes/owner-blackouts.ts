export default {
  routes: [
    {
      method: "GET",
      path: "/owner/blackouts",
      handler: "owner-blackouts.list",
      config: {
        auth: true,
      },
    },
    {
      method: "POST",
      path: "/owner/blackouts",
      handler: "owner-blackouts.create",
      config: {
        auth: true,
      },
    },
    {
      method: "DELETE",
      path: "/owner/blackouts/:id",
      handler: "owner-blackouts.remove",
      config: {
        auth: true,
      },
    },
  ],
};
