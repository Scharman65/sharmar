export default {
  routes: [
    {
      method: "GET",
      path: "/owner/profile-by-user",
      handler: "owner-profile-by-user.get",
      config: {
        auth: false,
      },
    },
  ],
};
