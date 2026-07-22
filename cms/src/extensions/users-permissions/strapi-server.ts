"use strict";

/**
 * Extend the standard Strapi Users & Permissions user model without replacing
 * its built-in attributes or relations.
 */
export default (plugin: any) => {
  const userContentType = plugin?.contentTypes?.user;
  const attributes = userContentType?.schema?.attributes;

  if (!attributes) {
    throw new Error(
      "users-permissions user schema is unavailable during plugin extension"
    );
  }

  userContentType.schema.attributes = {
    ...attributes,
    must_change_password: {
      type: "boolean",
      default: false,
      private: true,
    },
  };

  return plugin;
};
