export default {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/admin-translations/save-draft",
      handler: "admin-translation.saveDraft",
      config: {
        auth: false,
      },
    },
  ],
};
