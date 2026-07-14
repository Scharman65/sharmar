export default {
  routes: [
    {
      method: "POST",
      path: "/owner/profile-password-reset",
      handler: "owner-profile-password-reset.set",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/owner/profile-password-reset/find",
      handler: "owner-profile-password-reset.find",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/owner/profile-password-reset/consume",
      handler: "owner-profile-password-reset.consume",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/owner/profile-password-reset/complete",
      handler: "owner-profile-password-reset.completeReset",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/owner/profile-password-changed",
      handler: "owner-profile-password-reset.passwordChanged",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/owner/profile-change-password",
      handler: "owner-profile-password-reset.changePassword",
      config: { auth: false },
    },
  ],
};
