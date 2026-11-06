export const CATALOG_IMAGE_RESOURCES = [
  {
    key: "catalog-images",
    root: "catalog-images",
    actorTypes: ["user"] as ["user"],
    operations: {
      config_read: { permissions: [] },
      collections_read: { permissions: ["collections.view"] },
      collections_write: { permissions: ["collections.manage"] },
      collections_media: { permissions: ["collections.view", "products.view"] },
      categories_read: { permissions: ["categories.view"] },
      categories_write: { permissions: ["categories.manage"] },
      categories_media: { permissions: ["categories.view", "products.view"] },
    },
    profile: {
      children: {
        config: { actions: { GET: "config_read" } },
        collection: {
          item: {
            parameter: "id",
            profile: {
              actions: { GET: "collections_read", POST: "collections_write" },
              children: { media: { actions: { GET: "collections_media" } } },
            },
          },
        },
        category: {
          item: {
            parameter: "id",
            profile: {
              actions: { GET: "categories_read", POST: "categories_write" },
              children: { media: { actions: { GET: "categories_media" } } },
            },
          },
        },
      },
    },
  },
]
