export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/admin-crud/:entity",
      handler: "admin-crud.list",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/admin-crud/:entity",
      handler: "admin-crud.create",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/admin-crud/:entity/:id",
      handler: "admin-crud.detail",
      config: { auth: false },
    },
    {
      method: "PATCH",
      path: "/admin-crud/:entity/:id",
      handler: "admin-crud.update",
      config: { auth: false },
    },
    {
      method: "DELETE",
      path: "/admin-crud/:entity/:id",
      handler: "admin-crud.destroy",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/admin-crud/:entity/:id/dependencies",
      handler: "admin-crud.dependencies",
      config: { auth: false },
    },
  ],
};
