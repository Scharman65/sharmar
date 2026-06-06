export default {
  routes: [
    {
      method: "POST",
      path: "/hold",
      handler: "hold.create",
      config: {
        auth: false,
      },
    },
  ],
};
