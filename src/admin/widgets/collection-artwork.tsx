import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import CatalogArtwork from "../components/feature-artwork"
export default function CollectionArtwork({
  data,
}: DetailWidgetProps<HttpTypes.AdminCollection>) {
  return <CatalogArtwork key={data.id} kind="collection" id={data.id} />
}
export const config = defineWidgetConfig({
  zone: "product_collection.details",
  id: "extra-images:collection-artwork",
})
