import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import CatalogArtwork from "../components/feature-artwork"
export default function CategoryArtwork({
  data,
}: DetailWidgetProps<HttpTypes.AdminProductCategory>) {
  return <CatalogArtwork key={data.id} kind="category" id={data.id} />
}
export const config = defineWidgetConfig({
  zone: "product_category.details.side",
  id: "extra-images:category-artwork",
})
