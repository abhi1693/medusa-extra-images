import { MedusaService } from "@medusajs/framework/utils"
import ProductCollectionImage from "./models/product-collection-image"
export type ExtraImageOptions = {
  enableCategories?: boolean
  enableCollections?: boolean
  categoryImageKey?: string
  categoryRevisionKey?: string
}
export default class ExtraImageService extends MedusaService({
  ProductCollectionImage,
}) {
  readonly categoriesEnabled: boolean
  readonly collectionsEnabled: boolean
  readonly imageKey: string
  readonly revisionKey: string
  constructor(
    container: Record<string, unknown>,
    options: ExtraImageOptions = {}
  ) {
    super(container)
    this.categoriesEnabled = options.enableCategories ?? true
    this.collectionsEnabled = options.enableCollections ?? true
    this.imageKey = options.categoryImageKey ?? "extra_images_category_image"
    this.revisionKey =
      options.categoryRevisionKey ?? "extra_images_category_revision"
  }
}
