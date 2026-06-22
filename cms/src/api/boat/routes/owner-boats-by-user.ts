export default {
  routes: [
    {
      method: "GET",
      path: "/owner/boats-by-user",
      handler: "owner-boats-by-user.list",
      config: {
        auth: false,
      },
    },
  ],
};
