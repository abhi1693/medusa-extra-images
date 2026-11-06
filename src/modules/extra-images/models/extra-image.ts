import { model } from "@medusajs/framework/utils"
export default model
  .define("extra_image", {
    id: model.id({ prefix: "ximg" }).primaryKey(),
    owner_kind: model.enum(["category", "collection"]),
    owner_id: model.text(),
    url: model.text().nullable(),
    revision: model.text(),
  })
  .indexes([
    {
      name: "IDX_extra_image_owner",
      on: ["owner_kind", "owner_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])
