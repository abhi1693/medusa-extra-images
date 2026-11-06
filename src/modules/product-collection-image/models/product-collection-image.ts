import { model } from "@medusajs/framework/utils"
export default model
  .define("product_collection_image", {
    id: model.id({ prefix: "colli" }).primaryKey(),
    url: model.text(),
    rank: model.number(),
    product_collection_id: model.text(),
    metadata: model.json().nullable(),
  })
  .indexes([{ on: ["product_collection_id"] }])
