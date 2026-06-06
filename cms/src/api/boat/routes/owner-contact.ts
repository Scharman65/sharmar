export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/boats-owner-contact-by-slug/:slug",
      handler: "boat.ownerContactBySlug",
      config: {
        auth: false,
      },
    },
  ],
};
