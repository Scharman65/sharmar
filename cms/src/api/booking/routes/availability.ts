export default {
  routes: [
    {
      method: "GET",
      path: "/availability/:boatId",
      handler: "availability.get",
      config: {
        auth: false,
      },
    },
  ],
};
