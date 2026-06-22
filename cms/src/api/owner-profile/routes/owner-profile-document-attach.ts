export default {
  routes: [
    {
      method: "POST",
      path: "/owner/profile-document-attach",
      handler: "owner-profile-document-attach.attach",
      config: {
        auth: false,
      },
    },
  ],
};
