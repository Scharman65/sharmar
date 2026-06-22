export default {
  routes: [
    {
      method: "POST",
      path: "/owner/profile-create-for-user",
      handler: "owner-profile-create-for-user.create",
      config: {
        auth: false,
      },
    },
  ],
};
