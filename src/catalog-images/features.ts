import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
export function imageFeatures(scope: MedusaContainer) {
  const service = scope.resolve<{
    categoriesEnabled?: boolean
    collectionsEnabled?: boolean
  }>("extra_images")
  return {
    categories: service.categoriesEnabled !== false,
    collections: service.collectionsEnabled !== false,
  }
}
export function assertImageFeature(
  scope: MedusaContainer,
  kind: "category" | "collection"
) {
  const flags = imageFeatures(scope)
  if (!(kind === "category" ? flags.categories : flags.collections))
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "This image feature is disabled"
    )
}
