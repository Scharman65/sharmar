export default {
  routes: [
    {
      method: "POST",
      path: "/owner/media-ownership/register",
      handler: "owner-media-ownership.register",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/owner/media-ownership/verify",
      handler: "owner-media-ownership.verify",
      config: { auth: false },
    },
  ],
};
